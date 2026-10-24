import { useState } from 'react';
import { dict, type Locale } from '../i18n';
import { supportBase, supportHref } from '../lib/support';

const PRESETS = [300, 500, 1000] as const;

function amountFrom(preset: number | 'custom', custom: string): number | null {
  if (preset !== 'custom') return preset;
  const text = custom.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value >= 50 && value <= 100_000 ? value : null;
}

export default function Support({ locale }: { locale: Locale }) {
  const t = dict[locale].home;
  const [preset, setPreset] = useState<number | 'custom'>(500);
  const [custom, setCustom] = useState('');
  const amount = amountFrom(preset, custom);
  const href = amount === null ? '' : supportHref(supportBase(), amount);
  const label = t.supportButton.replace('{amount}', amount === null ? '…' : String(amount));

  return (
    <section className="support" data-reveal>
      <h2>
        <Heart />
        {t.supportTitle}
      </h2>
      <p>{t.supportText}</p>
      <div className="support-amounts" role="group" aria-label={t.supportTitle}>
        {PRESETS.map((value) => (
          <button key={value} type="button" aria-pressed={preset === value} onClick={() => setPreset(value)}>
            {value} ₽
          </button>
        ))}
      </div>
      <label className="support-custom">
        <span className="sr-only">{t.supportCustom}</span>
        <input
          inputMode="numeric"
          placeholder={t.supportCustom}
          value={custom}
          onFocus={() => setPreset('custom')}
          onChange={(event) => {
            setCustom(event.target.value);
            setPreset('custom');
          }}
        />
      </label>
      {href ? (
        <a className="button" href={href} target="_blank" rel="noreferrer">{label}</a>
      ) : (
        <button className="button" type="button" disabled>{label}</button>
      )}
      {!supportBase() && <p className="support-pending">{t.supportPending}</p>}
    </section>
  );
}

function Heart() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </svg>
  );
}
