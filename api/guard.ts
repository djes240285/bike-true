import { and, eq, gt } from 'drizzle-orm';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { hashSessionToken } from '../src/lib/session';
import { database } from './db';
import { sessions, users } from './schema';

export type SessionUser = typeof users.$inferSelect;

export async function currentUser(c: Context): Promise<SessionUser | null> {
  const token = getCookie(c, 'bt_session');
  if (!token) return null;
  const rows = await database()
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}
