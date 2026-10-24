import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { dict, type Locale } from '../i18n';
import { pathFor } from '../lib/paths';
import type { AngleReading } from '../lib/reading';
import { flagsFromEnv } from '../lib/visit';

const STORAGE_KEY = 'biketrue.reading';
const TIMES = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'] as const;

type Flags = ReturnType<typeof flagsFromEnv>;
type DayChoice = 'today' | 'tomorrow' | 'custom' | '';

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function formatWhen(locale: Locale, dateIso: string, time: string) {
  if (!dateIso && !time) return '';
  const datePart = dateIso
    ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(new Date(`${dateIso}T12:00:00`))
    : '';
  if (datePart && time) return `${datePart}, ${time}`;
  return datePart || time;
}

export default function VisitForm({ locale }: { locale: Locale }) {
  const t = dict[locale].visit;
  const [flags, setFlags] = useState<Flags>(flagsFromEnv({}));
  const [reading, setReading] = useState<(AngleReading & { hadTopPhoto: boolean }) | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [dayChoice, setDayChoice] = useState<DayChoice>('');
  const [customDate, setCustomDate] = useState('');
  const [time, setTime] = useState('');

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }, []);
  const minDate = ymd(today);
  const dateIso =
    dayChoice === 'today'
      ? ymd(today)
      : dayChoice === 'tomorrow'
        ? ymd(addDays(today, 1))
        : dayChoice === 'custom'
          ? customDate
          : '';
  const whenLabel = formatWhen(locale, dateIso, time);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hasNumber = ['knee', 'back', 'arm', 'hip'].some((key) => typeof parsed[key] === 'number');
        if (hasNumber) setReading(parsed);
        else sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    fetch('/api/flags')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data) setFlags(data);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '');
    const phone = String(form.get('phone') || '');
    if (!name.trim() || !phone.trim()) {
      setStatus('error');
      setError(t.required);
      return;
    }
    setStatus('sending');
    setError('');
    const response = await fetch('/api/visit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        when: whenLabel,
        comment: String(form.get('comment') || ''),
        locale,
        angles: reading ?? { knee: null, back: null, arm: null, hip: null },
        hadTopPhoto: reading?.hadTopPhoto === true,
        paymentsEnabled: flags.paymentsEnabled,
      }),
    });
    if (response.ok) {
      setStatus('sent');
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setStatus('error');
    if (response.status === 503 || payload.error === 'telegram_missing') setError(t.telegramMissing);
    else if (payload.error === 'name' || payload.error === 'phone') setError(t.required);
    else setError(t.telegramDown);
  }

  return (
    <form className="visit-form" onSubmit={onSubmit}>
      {reading ? <p className="note">{t.broughtAngles}</p> : null}
      <p className="muted">{flags.address || t.addressFallback}</p>
      {flags.paymentsEnabled ? (
        <div className="card breeze-card">
          {flags.priceRub ? <strong>{flags.priceRub} ₽</strong> : null}
          <p>{t.paymentOn}</p>
          {flags.checkoutUrl ? (
            <a className="button ghost" href={flags.checkoutUrl}>
              {t.paymentLink}
            </a>
          ) : (
            <p className="muted">{t.paymentNoLink}</p>
          )}
        </div>
      ) : null}
      <label>
        {t.name}
        <input name="name" autoComplete="name" required />
      </label>
      <label>
        {t.phone}
        <input name="phone" autoComplete="tel" required />
      </label>

      <fieldset className="when-field">
        <legend>{t.when}</legend>
        <p className="when-hint">{t.whenHint}</p>
        <p className="when-label">{t.whenDay}</p>
        <div className="chip-row" role="group" aria-label={t.whenDay}>
          <button
            type="button"
            className={`chip${dayChoice === 'today' ? ' is-on' : ''}`}
            onClick={() => setDayChoice(dayChoice === 'today' ? '' : 'today')}
          >
            {t.whenToday}
          </button>
          <button
            type="button"
            className={`chip${dayChoice === 'tomorrow' ? ' is-on' : ''}`}
            onClick={() => setDayChoice(dayChoice === 'tomorrow' ? '' : 'tomorrow')}
          >
            {t.whenTomorrow}
          </button>
          <button
            type="button"
            className={`chip${dayChoice === 'custom' ? ' is-on' : ''}`}
            onClick={() => setDayChoice(dayChoice === 'custom' ? '' : 'custom')}
          >
            {t.whenPickDay}
          </button>
        </div>
        {dayChoice === 'custom' ? (
          <label className="when-date">
            <span className="sr-only">{t.whenPickDay}</span>
            <input
              type="date"
              min={minDate}
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
            />
          </label>
        ) : null}
        <p className="when-label">{t.whenTime}</p>
        <div className="chip-row chip-row-wrap" role="group" aria-label={t.whenTime}>
          {TIMES.map((slot) => (
            <button
              key={slot}
              type="button"
              className={`chip chip-time${time === slot ? ' is-on' : ''}`}
              onClick={() => setTime(time === slot ? '' : slot)}
            >
              {slot}
            </button>
          ))}
        </div>
        {whenLabel ? <p className="when-preview breeze-text">{whenLabel}</p> : null}
      </fieldset>

      <label>
        {t.comment}
        <textarea name="comment" rows={4} />
      </label>
      <button className="button" type="submit" disabled={status === 'sending' || status === 'sent'}>
        {status === 'sending' ? t.sending : t.send}
      </button>
      {status === 'sent' ? <p className="ok">{t.sent}</p> : null}
      {status === 'error' ? <p className="warn">{error}</p> : null}
      <p>
        <a href={pathFor(locale, '/analyze')}>{dict[locale].nav.analyze}</a>
      </p>
    </form>
  );
}
