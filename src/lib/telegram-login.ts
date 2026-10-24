import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export function verifyTelegramLogin(fields: Record<string, string>, botToken: string, nowSec: number): boolean {
  const hash = fields.hash ?? '';
  const authDate = Number(fields.auth_date);
  if (!hash || !fields.id || !Number.isFinite(authDate)) return false;
  if (nowSec - authDate > 86400 || authDate > nowSec + 30) return false;
  const data = Object.keys(fields)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n');
  const secret = createHash('sha256').update(botToken).digest();
  const digest = createHmac('sha256', secret).update(data).digest();
  const given = Buffer.from(hash, 'hex');
  if (given.length !== digest.length) return false;
  return timingSafeEqual(given, digest);
}

export function telegramName(fields: { first_name?: string; last_name?: string; username?: string }): string {
  const full = [fields.first_name, fields.last_name].filter(Boolean).join(' ').trim();
  return (full || fields.username || 'Велосипедист').slice(0, 80);
}
