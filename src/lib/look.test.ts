import { describe, expect, test } from 'bun:test';
import { riderLookFrom, themeFrom } from './look';

describe('look', () => {
  test('тема только светлая или тёмная', () => {
    expect(themeFrom(null)).toBe('light');
    expect(themeFrom('light')).toBe('light');
    expect(themeFrom('dark')).toBe('dark');
    expect(themeFrom('neon')).toBe('light');
  });

  test('вид кабинета только из трёх ролей', () => {
    expect(riderLookFrom('child')).toBe('child');
    expect(riderLookFrom('teen')).toBe('teen');
    expect(riderLookFrom('adult')).toBe('adult');
    expect(riderLookFrom('woman')).toBe('');
    expect(riderLookFrom(null)).toBe('');
  });
});
