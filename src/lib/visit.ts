export type Locale = 'ru' | 'en';

export type VisitAngles = {
  knee: number | null;
  back: number | null;
  arm: number | null;
  hip: number | null;
};

export type VisitInput = {
  name: string;
  phone: string;
  when: string;
  comment: string;
  locale: Locale;
  angles: VisitAngles;
  hadTopPhoto: boolean;
  paymentsEnabled: boolean;
};

export type VisitResult =
  | { ok: true; text: string }
  | { ok: false; error: 'name' | 'phone' | 'photo' };

export const PHOTO_KEYS = ['photo', 'image', 'file', 'dataUrl', 'dataurl'];

export function hasPhotoField(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  return PHOTO_KEYS.some((key) => key in (body as Record<string, unknown>));
}

export function parseVisit(body: unknown): VisitResult {
  if (!body || typeof body !== 'object') return { ok: false, error: 'name' };
  const record = body as Record<string, unknown>;
  if (hasPhotoField(body)) return { ok: false, error: 'photo' };

  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const phone = typeof record.phone === 'string' ? record.phone.trim() : '';
  if (!name) return { ok: false, error: 'name' };
  if (!phone) return { ok: false, error: 'phone' };

  const angles = normalizeAngles(record.angles);
  const locale = record.locale === 'en' ? 'en' : 'ru';
  const text = formatVisit({
    name,
    phone,
    when: typeof record.when === 'string' ? record.when.trim() : '',
    comment: typeof record.comment === 'string' ? record.comment.trim() : '',
    locale,
    angles,
    hadTopPhoto: record.hadTopPhoto === true,
    paymentsEnabled: record.paymentsEnabled === true,
  });
  return { ok: true, text };
}

function normalizeAngles(value: unknown): VisitAngles {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    knee: asNumber(source.knee),
    back: asNumber(source.back),
    arm: asNumber(source.arm),
    hip: asNumber(source.hip),
  };
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

export function formatVisit(input: VisitInput): string {
  const angle = (label: string, value: number | null) => `${label}: ${value === null ? 'нет кадра' : `${value}°`}`;
  const lines = [
    'BikeTrue — заявка',
    `Имя: ${input.name}`,
    `Телефон: ${input.phone}`,
    `Когда: ${input.when || '—'}`,
    `Язык: ${input.locale}`,
    angle('Колено', input.angles.knee),
    angle('Спина', input.angles.back),
    angle('Рука', input.angles.arm),
    angle('Бедро', input.angles.hip),
    `Второй кадр: ${input.hadTopPhoto ? 'да' : 'нет'}`,
    `Оплата: ${input.paymentsEnabled ? 'флаг включён, человек видел цену' : 'бесплатно'}`,
  ];
  if (input.comment) lines.push(`Комментарий: ${input.comment}`);
  return lines.join('\n');
}

export async function deliverVisit(body: unknown, env: Record<string, string | undefined>) {
  const parsed = parseVisit(body);
  if (!parsed.ok) return { status: 400, body: parsed };
  const token = env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  const chat = env.TELEGRAM_CHAT_ID?.trim() ?? '';
  if (!token || !chat) return { status: 503, body: { ok: false, error: 'telegram_missing' } };

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: parsed.text }),
  });
  if (!response.ok) return { status: 502, body: { ok: false, error: 'telegram_down' } };
  return { status: 200, body: { ok: true } };
}

export function flagsFromEnv(env: Record<string, string | undefined>) {
  return {
    paymentsEnabled: env.PAYMENTS_ENABLED === 'true',
    priceRub: env.PRICE_RUB?.trim() ?? '',
    city: env.CITY?.trim() ?? '',
    durationMin: env.DURATION_MIN?.trim() ?? '',
    address: env.ADDRESS?.trim() ?? '',
    checkoutUrl: env.CHECKOUT_URL?.trim() ?? '',
  };
}
