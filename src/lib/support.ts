/** Публичная ссылка кассы. Пусто — кнопка поддержки не ведёт на оплату. */
export function supportBase(): string {
  const value = import.meta.env.PUBLIC_SUPPORT_URL;
  return typeof value === 'string' ? value.trim() : '';
}

/** Сумма уходит параметром amount. Касса может его проигнорировать. */
export function supportHref(base: string, amount: number): string {
  const raw = base.trim();
  if (!raw || !Number.isInteger(amount) || amount < 50 || amount > 100_000) return '';
  try {
    const url = new URL(raw);
    url.searchParams.set('amount', String(amount));
    return url.toString();
  } catch {
    return '';
  }
}
