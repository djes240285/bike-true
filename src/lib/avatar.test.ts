import { describe, expect, test } from 'bun:test';
import { avatarUrl, initials, yandexAvatar } from './avatar';

describe('аватар', () => {
  test('принимает фото Google, Яндекса и Telegram', () => {
    expect(avatarUrl('https://lh3.googleusercontent.com/a/abc')).toBe('https://lh3.googleusercontent.com/a/abc');
    expect(avatarUrl('https://t.me/i/userpic/320/me.jpg')).toBe('https://t.me/i/userpic/320/me.jpg');
    expect(yandexAvatar({ default_avatar_id: '123/abc', is_avatar_empty: false })).toBe(
      'https://avatars.yandex.net/get-yapic/123/abc/islands-68',
    );
  });

  test('чужой адрес и пустой яндекс не проходят', () => {
    expect(avatarUrl('http://lh3.googleusercontent.com/a/abc')).toBeNull();
    expect(avatarUrl('https://evil.example/a.jpg')).toBeNull();
    expect(avatarUrl('not a url')).toBeNull();
    expect(yandexAvatar({ default_avatar_id: '123/abc', is_avatar_empty: true })).toBeNull();
    expect(yandexAvatar({ default_avatar_id: '../secret', is_avatar_empty: false })).toBeNull();
  });

  test('инициалы из имени', () => {
    expect(initials('Eugene Zhukov')).toBe('EZ');
    expect(initials('Женя')).toBe('Ж');
  });
});
