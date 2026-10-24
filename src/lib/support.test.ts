import { describe, expect, test } from 'bun:test';
import { supportHref } from './support';

describe('support link', () => {
  test('сумма дописывается в ссылку, пустая и кривая ссылка молчат', () => {
    expect(supportHref('https://pay.example/tip', 500)).toBe('https://pay.example/tip?amount=500');
    expect(supportHref('https://pay.example/tip?from=site', 300)).toBe('https://pay.example/tip?from=site&amount=300');
    expect(supportHref('', 500)).toBe('');
    expect(supportHref('not a url', 500)).toBe('');
    expect(supportHref('https://pay.example/tip', 49)).toBe('');
  });
});
