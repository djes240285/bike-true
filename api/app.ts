import { randomBytes } from 'node:crypto';
import { and, count, desc, eq, lt } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { getCookie } from 'hono/cookie';
import { BIKE_LIMIT, READING_LIMIT, cabinetNext, overLimit, parseBike, parseDisplayName, parseProfile, parseReading } from '../src/lib/account';
import { googleAuthUrl, yandexAuthUrl } from '../src/lib/oauth-url';
import { clearSessionCookie, hashSessionToken, newSessionToken, sessionCookie } from '../src/lib/session';
import { telegramName, verifyTelegramLogin } from '../src/lib/telegram-login';
import { database } from './db';
import { currentUser } from './guard';
import { signIn, type Provider } from './identity';
import { bikes, identities, oauthStates, profiles, readings, sessions, users } from './schema';

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

function positiveId(raw: string): number | null {
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id > 2147483647) return null;
  return id;
}

function readingJson(row: {
  id: number;
  bikeId: number | null;
  bikeName: string | null;
  fit: 'city' | 'endurance' | 'race' | 'mtb';
  knee: number | null;
  back: number | null;
  arm: number | null;
  hip: number | null;
  hadTop: number;
  createdAt: Date;
}) {
  return {
    id: row.id,
    bike_id: row.bikeId,
    bike_name: row.bikeName,
    fit: row.fit,
    knee: row.knee,
    back: row.back,
    arm: row.arm,
    hip: row.hip,
    had_top: Number(row.hadTop) === 1,
    created_at: row.createdAt.toISOString(),
  };
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

  app.onError((error, c) => {
    console.error(error);
    return c.json({ ok: false, error: 'provider' }, 503);
  });

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
    if (token) {
      try {
        await database().delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
      } catch (error) {
        console.error(error);
      }
    }
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

  app.put('/profile', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const parsed = parseProfile(await c.req.json().catch(() => null));
    if (!parsed.ok) return c.json({ ok: false, error: parsed.error }, 400);
    const now = new Date();
    await database()
      .insert(profiles)
      .values({
        userId: user.id,
        rider: parsed.profile.rider,
        heightCm: parsed.profile.heightCm,
        inseamCm: parsed.profile.inseamCm,
        updatedAt: now,
      })
      .onDuplicateKeyUpdate({
        set: {
          rider: parsed.profile.rider,
          heightCm: parsed.profile.heightCm,
          inseamCm: parsed.profile.inseamCm,
          updatedAt: now,
        },
      });
    return c.json({ ok: true });
  });

  app.get('/bikes', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const rows = await database()
      .select()
      .from(bikes)
      .where(eq(bikes.userId, user.id))
      .orderBy(desc(bikes.updatedAt), desc(bikes.id));
    return c.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        fit: row.fit,
        crank_mm: row.crankMm,
        saddle_mm: row.saddleMm,
        stem_mm: row.stemMm,
        drop_mm: row.dropMm,
      })),
    );
  });

  app.post('/bikes', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const parsed = parseBike(await c.req.json().catch(() => null));
    if (!parsed.ok) return c.json({ ok: false, error: parsed.error }, 400);
    const db = database();
    const counted = await db.select({ total: count() }).from(bikes).where(eq(bikes.userId, user.id));
    if (overLimit(Number(counted[0]?.total ?? 0), BIKE_LIMIT)) return c.json({ ok: false, error: 'limit' }, 409);
    const now = new Date();
    await db.insert(bikes).values({
      userId: user.id,
      name: parsed.bike.name,
      fit: parsed.bike.fit,
      crankMm: parsed.bike.crankMm,
      saddleMm: parsed.bike.saddleMm,
      stemMm: parsed.bike.stemMm,
      dropMm: parsed.bike.dropMm,
      createdAt: now,
      updatedAt: now,
    });
    return c.json({ ok: true });
  });

  app.put('/bikes/:id', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const id = positiveId(c.req.param('id'));
    if (id === null) return c.json({ ok: false, error: 'bike' }, 404);
    const db = database();
    const owned = await db
      .select({ id: bikes.id })
      .from(bikes)
      .where(and(eq(bikes.id, id), eq(bikes.userId, user.id)))
      .limit(1);
    if (!owned[0]) return c.json({ ok: false, error: 'bike' }, 404);
    const parsed = parseBike(await c.req.json().catch(() => null));
    if (!parsed.ok) return c.json({ ok: false, error: parsed.error }, 400);
    await db
      .update(bikes)
      .set({
        name: parsed.bike.name,
        fit: parsed.bike.fit,
        crankMm: parsed.bike.crankMm,
        saddleMm: parsed.bike.saddleMm,
        stemMm: parsed.bike.stemMm,
        dropMm: parsed.bike.dropMm,
        updatedAt: new Date(),
      })
      .where(and(eq(bikes.id, id), eq(bikes.userId, user.id)));
    return c.json({ ok: true });
  });

  app.delete('/bikes/:id', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const id = positiveId(c.req.param('id'));
    if (id === null) return c.json({ ok: false, error: 'bike' }, 404);
    const db = database();
    const owned = await db
      .select({ id: bikes.id })
      .from(bikes)
      .where(and(eq(bikes.id, id), eq(bikes.userId, user.id)))
      .limit(1);
    if (!owned[0]) return c.json({ ok: false, error: 'bike' }, 404);
    // bike_id у снимков обнуляет внешний ключ, строки readings здесь не удаляем.
    await db.delete(bikes).where(and(eq(bikes.id, id), eq(bikes.userId, user.id)));
    return c.json({ ok: true });
  });

  app.get('/readings', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const rows = await database()
      .select({
        id: readings.id,
        bikeId: readings.bikeId,
        bikeName: bikes.name,
        fit: readings.fit,
        knee: readings.knee,
        back: readings.back,
        arm: readings.arm,
        hip: readings.hip,
        hadTop: readings.hadTop,
        createdAt: readings.createdAt,
      })
      .from(readings)
      .leftJoin(bikes, eq(readings.bikeId, bikes.id))
      .where(eq(readings.userId, user.id))
      .orderBy(desc(readings.createdAt), desc(readings.id))
      .limit(50);
    return c.json(rows.map((row) => readingJson(row)));
  });

  app.post('/readings', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const parsed = parseReading(await c.req.json().catch(() => null));
    if (!parsed.ok) return c.json({ ok: false, error: parsed.error }, 400);
    const db = database();
    const counted = await db.select({ total: count() }).from(readings).where(eq(readings.userId, user.id));
    if (overLimit(Number(counted[0]?.total ?? 0), READING_LIMIT)) return c.json({ ok: false, error: 'limit' }, 409);
    if (parsed.reading.bikeId !== null) {
      const owned = await db
        .select({ id: bikes.id })
        .from(bikes)
        .where(and(eq(bikes.id, parsed.reading.bikeId), eq(bikes.userId, user.id)))
        .limit(1);
      if (!owned[0]) return c.json({ ok: false, error: 'bike' }, 404);
    }
    const { fit, bikeId, knee, back, arm, hip, hadTop } = parsed.reading;
    await db.insert(readings).values({
      userId: user.id,
      bikeId,
      fit,
      knee,
      back,
      arm,
      hip,
      hadTop: hadTop ? 1 : 0,
      createdAt: new Date(),
    });
    return c.json({ ok: true });
  });

  app.delete('/readings/:id', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    const id = positiveId(c.req.param('id'));
    if (id === null) return c.json({ ok: false, error: 'angles' }, 404);
    const db = database();
    const owned = await db
      .select({ id: readings.id })
      .from(readings)
      .where(and(eq(readings.id, id), eq(readings.userId, user.id)))
      .limit(1);
    if (!owned[0]) return c.json({ ok: false, error: 'angles' }, 404);
    await db.delete(readings).where(and(eq(readings.id, id), eq(readings.userId, user.id)));
    return c.json({ ok: true });
  });

  app.get('/studio', async (c) => {
    const user = await currentUser(c);
    if (!user) return c.json({ ok: false, error: 'session' }, 401);
    if (user.role !== 'fitter') return c.json({ ok: false, error: 'forbidden' }, 403);
    const rows = await database()
      .select({
        id: readings.id,
        bikeId: readings.bikeId,
        bikeName: bikes.name,
        fit: readings.fit,
        knee: readings.knee,
        back: readings.back,
        arm: readings.arm,
        hip: readings.hip,
        hadTop: readings.hadTop,
        createdAt: readings.createdAt,
        userName: users.name,
      })
      .from(readings)
      .innerJoin(users, eq(readings.userId, users.id))
      .leftJoin(bikes, eq(readings.bikeId, bikes.id))
      .orderBy(desc(readings.createdAt), desc(readings.id))
      .limit(100);
    return c.json(rows.map((row) => ({ ...readingJson(row), user_name: row.userName })));
  });

  return app;
}
