import { describe, expect, test } from 'bun:test';
import { flagsFromEnv, parseVisit } from './visit';

const angles = { knee: 132.44, back: 41, arm: null, hip: null };

describe('visit', () => {
  test('пустое имя и телефон отклоняются', () => {
    expect(parseVisit({ name: '  ', phone: '+7', angles })).toEqual({ ok: false, error: 'name' });
    expect(parseVisit({ name: 'Аня', phone: '  ', angles })).toEqual({ ok: false, error: 'phone' });
  });

  test('картинка в теле не принимается', () => {
    expect(parseVisit({ name: 'Аня', phone: '1', dataUrl: 'abc' }).ok).toBe(false);
  });

  test('текст заявки содержит углы и не требует оплаты при выключенном флаге', () => {
    const result = parseVisit({
      name: 'Аня',
      phone: '+7 900',
      when: 'суббота',
      comment: '',
      locale: 'ru',
      angles,
      hadTopPhoto: false,
      paymentsEnabled: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain('Колено: 132.4°');
    expect(result.text).toContain('Рука: нет кадра');
    expect(result.text).toContain('Оплата: бесплатно');
    expect(result.text).not.toContain('dataUrl');
  });

  test('включённый флаг помечает, что цену показали', () => {
    const result = parseVisit({
      name: 'Ann',
      phone: '1',
      angles,
      paymentsEnabled: true,
      hadTopPhoto: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain('флаг включён');
    expect(result.text).toContain('Второй кадр: да');
  });

  test('флаг оплаты читается только из строки true', () => {
    expect(flagsFromEnv({ PAYMENTS_ENABLED: 'true' }).paymentsEnabled).toBe(true);
    expect(flagsFromEnv({ PAYMENTS_ENABLED: 'false' }).paymentsEnabled).toBe(false);
    expect(flagsFromEnv({}).paymentsEnabled).toBe(false);
  });

  test('без токена заявка не уходит в Telegram', async () => {
    const { deliverVisit } = await import('./visit');
    const result = await deliverVisit(
      { name: 'Аня', phone: '1', angles: { knee: null, back: null, arm: null, hip: null } },
      {},
    );
    expect(result.status).toBe(503);
  });
});
