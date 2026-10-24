import { describe, expect, test } from 'bun:test';
import { telegramName, verifyTelegramLogin } from './telegram-login';

const fields = {
  id: '42',
  first_name: 'Дима',
  auth_date: '1700000000',
  username: 'dima',
  hash: '6dfd2b875e7b2893ec46c001e1cfa7027eef6945e353af00d0ad765883464a67',
};

describe('telegram login', () => {
  test('верная подпись проходит, порченая и просроченная нет', () => {
    expect(verifyTelegramLogin(fields, 'test-bot-token', 1700000100)).toBe(true);
    expect(verifyTelegramLogin({ ...fields, hash: '00' }, 'test-bot-token', 1700000100)).toBe(false);
    expect(verifyTelegramLogin(fields, 'test-bot-token', 1700000000 + 86401)).toBe(false);
    expect(verifyTelegramLogin(fields, 'other-token', 1700000100)).toBe(false);
  });

  test('имя собирается из виджета', () => {
    expect(telegramName({ first_name: 'Дима', last_name: 'Фитер' })).toBe('Дима Фитер');
    expect(telegramName({ username: 'dima' })).toBe('dima');
    expect(telegramName({})).toBe('Велосипедист');
  });
});
