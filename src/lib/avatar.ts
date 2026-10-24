const HOSTS = ['googleusercontent.com', 'avatars.yandex.net', 't.me'];

/** Оставляем только https-адрес аватарки с известных хостов. */
export function avatarUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 512) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  const known = HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
  return known ? url.toString() : null;
}

/** Адрес аватарки Яндекса. Пустой профиль не подставляем. */
export function yandexAvatar(info: { default_avatar_id?: unknown; is_avatar_empty?: unknown }): string | null {
  const empty = info.is_avatar_empty;
  if (empty === true || empty === 1 || empty === '1' || empty === 'true') return null;
  const id = info.default_avatar_id;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9/_-]{1,80}$/.test(id) || id.includes('..') || id.includes('//')) return null;
  return avatarUrl(`https://avatars.yandex.net/get-yapic/${id}/islands-68`);
}

/** Две буквы для кружка, когда фото нет. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => Array.from(part)[0] ?? '').join('');
  return (letters || '•').toLocaleUpperCase('ru');
}
