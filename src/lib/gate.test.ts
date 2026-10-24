import { describe, expect, test } from 'bun:test';
import { cookieValue, gateToken, isOpenPath, isPwaAsset, loginDecision, safeNext, tokensMatch } from './gate';

describe('gate', () => {
  test('путь после входа остаётся на сайте', () => {
    expect(safeNext('/analyze')).toBe('/analyze');
    expect(safeNext('/en/how-to-shoot?x=1')).toBe('/en/how-to-shoot?x=1');
    expect(safeNext('https://evil.test')).toBe('/');
    expect(safeNext('//evil.test')).toBe('/');
    expect(safeNext('/enter?next=/')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });

  test('иконки и оболочка открыты, страницы сайта нет', () => {
    expect(isOpenPath('/enter')).toBe(true);
    expect(isPwaAsset('/sw.js')).toBe(true);
    expect(isPwaAsset('/manifest.webmanifest')).toBe(true);
    expect(isPwaAsset('/icons/icon-192.png')).toBe(true);
    expect(isPwaAsset('/offline/index.html')).toBe(true);
    expect(isOpenPath('/analyze')).toBe(false);
    expect(isPwaAsset('/icons/../analyze')).toBe(false);
  });

  test('кука читается по имени', () => {
    expect(cookieValue('a=1; bt_gate=abc; b=2')).toBe('abc');
    expect(cookieValue(null)).toBe('');
  });

  test('тот же пароль даёт тот же знак, другой пароль нет', async () => {
    const a = await gateToken('один');
    const b = await gateToken('один');
    const c = await gateToken('другой');
    expect(tokensMatch(a, b)).toBe(true);
    expect(tokensMatch(a, c)).toBe(false);
  });

  test('верный пароль пускает, неверный и пустой нет', async () => {
    const ok = await loginDecision('секрет', 'секрет', '/visit');
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.next).toBe('/visit');

    const wrong = await loginDecision('секрет', 'нет', '/visit');
    expect(wrong).toMatchObject({ ok: false, error: 'wrong', next: '/visit' });

    const closed = await loginDecision('  ', 'секрет', '/');
    expect(closed).toMatchObject({ ok: false, error: 'closed' });
  });
});
