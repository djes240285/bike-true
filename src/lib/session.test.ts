import { describe, expect, test } from 'bun:test';
import { clearSessionCookie, hashSessionToken, newSessionToken, sessionCookie } from './session';

describe('session', () => {
  test('хеш не равен куке и устойчив', () => {
    const first = newSessionToken();
    expect(first.hash).not.toBe(first.token);
    expect(hashSessionToken(first.token)).toBe(first.hash);
    expect(first.token.length).toBeGreaterThan(20);
  });

  test('кука HttpOnly Secure SameSite None на 30 дней', () => {
    expect(sessionCookie('abc')).toBe('bt_session=abc; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000');
    expect(clearSessionCookie()).toBe('bt_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0');
  });
});
