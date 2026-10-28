import { describe, expect, test } from 'bun:test';
import { dict } from '../i18n';

describe('cabinet copy', () => {
  test('главная больше не обещает полный отказ от входа', () => {
    expect(dict.ru.home.proof[2]).toBe('Можно без входа');
    expect(dict.en.home.proof[2]).toBe('No account needed');
  });

  test('инструкция шва говорит про стену, книгу и обувь', () => {
    expect(dict.ru.account.inseamHelp).toContain('книг');
    expect(dict.ru.account.inseamHelp).toContain('обуви');
    expect(dict.ru.account.bikeNote).toContain('вынос');
    expect(dict.ru.account.bikeNote).toContain('не пересчитываются');
    expect(dict.en.account.inseamHelp.length).toBeGreaterThan(20);
  });
});
