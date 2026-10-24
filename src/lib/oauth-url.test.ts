import { describe, expect, test } from 'bun:test';
import { googleAuthUrl, yandexAuthUrl } from './oauth-url';

describe('oauth urls', () => {
  test('Google получает код, почту и state', () => {
    const url = new URL(googleAuthUrl('gid', 'http://localhost:8787/auth/google/callback', 'st'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('gid');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:8787/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('st');
  });

  test('Яндекс просит почту и имя', () => {
    const url = new URL(yandexAuthUrl('yid', 'http://localhost:8787/auth/yandex/callback', 'st'));
    expect(url.origin + url.pathname).toBe('https://oauth.yandex.ru/authorize');
    expect(url.searchParams.get('client_id')).toBe('yid');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('login:email login:info');
    expect(url.searchParams.get('state')).toBe('st');
  });
});
