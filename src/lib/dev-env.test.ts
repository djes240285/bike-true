import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'bun:test';
import { envForRequest, parseEnvFile } from './dev-env';

describe('dev env', () => {
  test('комментарии и кавычки разбираются', () => {
    expect(parseEnvFile('# note\n\nSITE_PASSWORD="secret"\nexport CITY=Сочи\n')).toEqual({
      SITE_PASSWORD: 'secret',
      CITY: 'Сочи',
    });
  });

  test('пустая переменная процесса не затирает значение из файла', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biketrue-env-'));
    fs.writeFileSync(path.join(dir, '.env'), 'TELEGRAM_CHAT_ID=-1000000001\nTELEGRAM_BOT_TOKEN=token\n');
    const env = envForRequest('development', dir, {
      TELEGRAM_CHAT_ID: '',
      TELEGRAM_BOT_TOKEN: 'old',
    });
    expect(env.TELEGRAM_CHAT_ID).toBe('-1000000001');
    expect(env.TELEGRAM_BOT_TOKEN).toBe('token');
  });
});
