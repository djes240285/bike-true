import type { Locale } from '../i18n';

export function pathFor(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === 'ru') return clean;
  return clean === '/' ? '/en' : `/en${clean}`;
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'ru' ? 'en' : 'ru';
}
