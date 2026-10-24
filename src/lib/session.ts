import { createHash, randomBytes } from 'node:crypto';

const MAX_AGE = 60 * 60 * 24 * 30;

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashSessionToken(token) };
}

export function sessionCookie(token: string): string {
  return `bt_session=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return 'bt_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0';
}
