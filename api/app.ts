import { randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { getCookie } from 'hono/cookie';
import { cabinetNext, parseDisplayName } from '../src/lib/account';
import { googleAuthUrl, yandexAuthUrl } from '../src/lib/oauth-url';
import { clearSessionCookie, hashSessionToken, newSessionToken, sessionCookie } from '../src/lib/session';
import { telegramName, verifyTelegramLogin } from '../src/lib/telegram-login';
import { database } from './db';
import { currentUser } from './guard';
import { signIn, type Provider } from './identity';
import { identities, oauthStates, profiles, sessions, users } from './schema';

type OAuthProvider = 'google' | 'yandex';

const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;

function setSession(c: Context, token: string) {
  c.header('Set-Cookie', sessionCookie(token));
}

async function startSession(userId: number) {
  const issued = newSessionToken();
  const now = new Date();
  await database().insert(sessions).values({
    userId,
    tokenHash: issued.hash,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    createdAt: now,
  });
  return issued.token;
}

function webOrigin() {
  return process.env.WEB_ORIGIN?.trim() || 'http://localhost:4321';
}

function apiOrigin() {
  return process.env.API_ORIGIN?.trim() || 'http://localhost:8787';
}

function credentials(provider: OAuthProvider) {
  const prefix = provider === 'google' ? 'GOOGLE' : 'YANDEX';
  return {
    clientId: process.env[`${prefix}_CLIENT_ID`]?.trim() ?? '',
    clientSecret: process.env[`${prefix}_CLIENT_SECRET`]?.trim() ?? '',
  };
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function exchangeProfile(provider: OAuthProvider, code: string) {
  const { clientId, clientSecret } = credentials(provider);
  const redirectUri = `${apiOrigin()}/auth/${provider}/callback`;
  const tokenUrl = provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://oauth.yandex.ru/token';
  try {
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!tokenResponse.ok) return null;
    const accessToken = text(((await tokenResponse.json()) as Record<string, unknown>).access_token);
    if (!accessToken) return null;

    if (provider === 'google') {
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) return null;
      const info = (await response.json()) as Record<string, unknown>;
      const id = text(info.sub);
      if (!id) return null;
      // Почту, которую Google не подтвердил, не берём: по ней связываются аккаунты.
      const email = info.email_verified === false ? '' : text(info.email);
      return { id, email: email || null, name: text(info.name) };
    }

    const response = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const info = (await response.json()) as Record<string, unknown>;
    const id = text(info.id);
    if (!id) return null;
    return {
      id,
      email: text(info.default_email) || null,
      name: text(info.display_name) || text(info.real_name),
    };
  } catch {
    return null;
  }
}

export function createApp() {
  const app = new Hono();
  const origin = webOrigin();
  app.use('*', cors({ origin, credentials: true, allowHeaders: ['Content-Type', 'X-BikeTrue'] }));
  app.use('*', async (c, next) => {
    const method = c.req.method;
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && c.req.header('x-biketrue') !== '1') {
      return c.json({ ok: false, error: 'forbidden' }, 403);
    }
    await next();
  });

  app.onError((_error, c) => c.json({ ok: false, error: 'provider' }, 503));

  app.get('/auth/config', (c) => c.json({ telegramUsername: process.env.TELEGRAM_BOT_USERNAME?.trim() || null }));

  for (const provider of ['google', 'yandex'] as const) {
    app.get(`/auth/${provider}`, async (c) => {
      const { clientId } = credentials(provider);
      if (!clientId) return c.json({ ok: false, error: 'provider' }, 503);
      const state = randomBytes(24).toString('base64url');
      const user = await currentUser(c);
      await database().insert(oauthStates).values({
        state,
        provider,
        userId: user?.id ?? null,
        next: cabinetNext(c.req.query('next')),
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      });
      const redirectUri = `${apiOrigin()}/auth/${provider}/callback`;
      const build = provider === 'google' ? googleAuthUrl : yandexAuthUrl;
      return c.redirect(build(clientId, redirectUri, state));
    });

    app.get(`/auth/${provider}/callback`, async (c) => {
      const db = database();
      const state = c.req.query('state') ?? '';
      const rows = state ? await db.select().from(oauthStates).where(eq(oauthStates.state, state)).limit(1) : [];
      const row = rows[0];
      if (row) await db.delete(oauthStates).where(eq(oauthStates.state, state));
      await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));
      if (!row || row.provider !== provider || row.expiresAt.getTime() <= Date.now()) {
        return c.json({ ok: false, error: 'state' }, 400);
      }

      const code = c.req.query('code') ?? '';
      const profile = code ? await exchangeProfile(provider, code) : null;
      if (!profile) return c.json({ ok: false, error: 'provider' }, 502);

      const result = await signIn({
        provider: provider as Provider,
        providerUserId: profile.id,
        email: profile.email,
        name: profile.name,
        sessionUserId: row.userId,
      });
      if (!result.ok) return c.json({ ok: false, error: 'taken' }, 409);

      setSession(c, await startSession(result.userId));
      return c.redirect(`${webOrigin()}${row.next}`);
    });
  }

  app.post('/auth/telegram', async (c) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
    const body = await c.req.json().catch(() => null);
    if (!botToken || !body || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ ok: false, error: 'telegram' }, 401);
    }
    const { next, ...rest } = body as Record<string, unknown>;
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(rest)) {
      if (typeof value !== 'string') return c.json({ ok: false, error: 'telegram' }, 401);
      fields[key] = value;
    }
    if (!verifyTelegramLogin(fields, botToken, Math.floor(Date.now() / 1000))) {
      return c.json({ ok: false, error: 'telegram' }, 401);
    }

    const user = await currentUser(c);
    const result = await signIn({
      provider: 'telegram',
      providerUserId: fields.id,
      email: null,
      name: telegramName(fields),
      sessionUserId: user?.id ?? null,
    });
    if (!result.ok) return c.json({ ok: false, error: 'taken' }, 409);

    setSession(c, await startSession(result.userId));
    return c.json({ ok: true, next: cabinetNext(typeof next === 'string' ? next : null) });
  });

  app.post('/auth/logout', async (c) => {
    const token = getCookie(c, 'bt_session');
    if (token) await database().delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
    c.header('Set-Cookie', clearSessionCookie());
    return c.json({ ok: true });
  });

  app.get('/me', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const db = database();
    const linked = await db.select({ provider: identities.provider }).from(identities).where(eq(identities.userId, user.id));
    const profileRows = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
    const profile = profileRows[0];
    return c.json({
      name: user.name,
      email: user.email,
      role: user.role,
      providers: [...new Set(linked.map((item) => item.provider))],
      profile: profile
        ? { rider: profile.rider ?? null, height_cm: profile.heightCm ?? null, inseam_cm: profile.inseamCm ?? null }
        : null,
    });
  });

  app.put('/me', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const body = await c.req.json().catch(() => null);
    const parsed = parseDisplayName(body && typeof body === 'object' ? (body as Record<string, unknown>).name : undefined);
    if (!parsed.ok) return c.json({ ok: false, error: 'name' }, 400);
    await database().update(users).set({ name: parsed.name }).where(eq(users.id, user.id));
    return c.json({ ok: true });
  });

  app.delete('/me', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    await database().delete(users).where(eq(users.id, user.id));
    c.header('Set-Cookie', clearSessionCookie());
    return c.json({ ok: true });
  });

  return app;
}
