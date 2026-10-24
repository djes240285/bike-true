import { and, eq } from 'drizzle-orm';
import { decideLink } from '../src/lib/link';
import { database } from './db';
import { identities, users } from './schema';

export type Provider = 'google' | 'yandex' | 'telegram';

type SignInInput = {
  provider: Provider;
  providerUserId: string;
  email: string | null;
  name: string;
  sessionUserId: number | null;
};
type SignInResult = { ok: true; userId: number } | { ok: false; error: 'taken' };

function isDuplicate(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    const item = current as { errno?: unknown; code?: unknown; cause?: unknown };
    if (item.errno === 1062 || item.code === 'ER_DUP_ENTRY') return true;
    current = item.cause;
  }
  return false;
}

export async function signIn(input: SignInInput): Promise<SignInResult> {
  try {
    return await signInOnce(input);
  } catch (error) {
    if (!isDuplicate(error)) throw error;
  }
  try {
    return await signInOnce(input);
  } catch (error) {
    if (isDuplicate(error)) return { ok: false, error: 'taken' };
    throw error;
  }
}

async function signInOnce(input: SignInInput): Promise<SignInResult> {
  const db = database();
  const email = input.email?.trim().toLowerCase() || null;
  const name = input.name.trim().slice(0, 80) || 'Велосипедист';

  const identityRows = await db
    .select({ userId: identities.userId })
    .from(identities)
    .where(and(eq(identities.provider, input.provider), eq(identities.providerUserId, input.providerUserId)))
    .limit(1);
  const emailRows = email
    ? await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    : [];

  const decision = decideLink({
    sessionUserId: input.sessionUserId,
    identityUserId: identityRows[0]?.userId ?? null,
    emailUserId: emailRows[0]?.id ?? null,
  });

  if (decision.action === 'taken') return { ok: false, error: 'taken' };

  if (decision.action === 'login') {
    if (email) {
      const owner = await db.select({ email: users.email }).from(users).where(eq(users.id, decision.userId)).limit(1);
      const emailTakenByOther = emailRows[0] !== undefined && emailRows[0].id !== decision.userId;
      if (owner[0] && owner[0].email === null && !emailTakenByOther) {
        await db.update(users).set({ email }).where(eq(users.id, decision.userId));
      }
    }
    return { ok: true, userId: decision.userId };
  }

  if (decision.action === 'attach' || decision.action === 'attach-email') {
    await db.insert(identities).values({
      userId: decision.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      createdAt: new Date(),
    });
    return { ok: true, userId: decision.userId };
  }

  const now = new Date();
  const userId = await db.transaction(async (tx) => {
    const [created] = await tx.insert(users).values({ name, email, role: 'rider', createdAt: now });
    await tx.insert(identities).values({
      userId: created.insertId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      createdAt: now,
    });
    return created.insertId;
  });
  return { ok: true, userId };
}
