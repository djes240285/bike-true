import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { dict, type Locale } from '../i18n';
import { bandFor } from '../lib/advice';
import { FIT_IDS, RIDER_IDS, type FitId, type RiderId } from '../lib/fits';
import { readingSetup, type ReadingSetup } from '../lib/reading-setup';
import { readRiderLook, writeRiderLook } from '../lib/look';
import { pathFor } from '../lib/paths';
import { cmSuggestion, mmFits, parseMmInput, type BikeMmKey } from '../lib/account';
import { apiUrl, cabinetFetch } from '../lib/cabinet-client';
import MeasureHint from './MeasureHint';
import Pick from './Pick';
import Wheel from './Wheel';

type Screen = 'home' | 'body' | 'bikes' | 'readings' | 'studio' | 'signin';
type Provider = 'google' | 'yandex' | 'telegram';
type Angle = 'knee' | 'back' | 'arm' | 'hip';

type Me = {
  name: string;
  email: string | null;
  role: string;
  providers: string[];
  profile: { rider: RiderId | null; height_cm: number | null; inseam_cm: number | null } | null;
};

type Bike = {
  id: number;
  name: string;
  fit: FitId;
  crank_mm: number | null;
  saddle_mm: number | null;
  stem_mm: number | null;
  drop_mm: number | null;
};

type ReadingRow = {
  id: number;
  bike_id: number | null;
  bike_name: string | null;
  fit: FitId;
  knee: number | null;
  back: number | null;
  arm: number | null;
  hip: number | null;
  had_top: boolean;
  captured: boolean;
  rider: RiderId | null;
  height_cm: number | null;
  inseam_cm: number | null;
  crank_mm: number | null;
  saddle_mm: number | null;
  stem_mm: number | null;
  drop_mm: number | null;
  created_at?: string;
  user_name?: string;
};

type Session = { state: 'loading' } | { state: 'out' } | { state: 'in'; me: Me } | { state: 'error' };

const ANGLES: Angle[] = ['knee', 'back', 'arm', 'hip'];
const PROVIDER_NAMES: Record<Locale, Record<Provider, string>> = {
  ru: { google: 'Google', yandex: 'Яндекс', telegram: 'Telegram' },
  en: { google: 'Google', yandex: 'Yandex', telegram: 'Telegram' },
};

/** Пустая строка — null, целое число — число, всё остальное — ошибка (undefined). */
function parseInt0(raw: string): number | null | undefined {
  const text = raw.trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isInteger(value) ? value : undefined;
}

function showNum(value: number | null): string {
  return value === null ? '' : String(value);
}

function oauthHref(provider: 'google' | 'yandex', next: string): string {
  return `${apiUrl()}/auth/${provider}?next=${encodeURIComponent(next)}`;
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function TelegramLogin({ locale, next }: { locale: Locale; next: string }) {
  const t = dict[locale].account;
  const host = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) return undefined;
    let alive = true;
    const win = window as unknown as Record<string, unknown>;
    win.onBikeTrueTelegram = async (user: Record<string, unknown>) => {
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(user)) {
        if (value === undefined || value === null) continue;
        fields[key] = String(value);
      }
      try {
        const res = await cabinetFetch('/auth/telegram', { method: 'POST', body: JSON.stringify({ ...fields, next }) });
        const data = await readJson<{ ok?: boolean; error?: string; next?: string }>(res);
        if (!alive) return;
        if (res.ok && data?.ok) {
          location.assign(data.next || next);
        } else if (data?.error === 'taken') {
          setMessage(t.taken);
        } else {
          setMessage(t.error);
        }
      } catch {
        if (alive) setMessage(t.error);
      }
    };
    (async () => {
      try {
        const res = await cabinetFetch('/auth/config');
        const data = await readJson<{ telegramUsername: string | null }>(res);
        if (!alive || !res.ok || !data?.telegramUsername || !host.current) return;
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', data.telegramUsername);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onBikeTrueTelegram(user)');
        host.current.appendChild(script);
      } catch {
        /* виджета нет — остаются другие входы */
      }
    })();
    return () => {
      alive = false;
      delete win.onBikeTrueTelegram;
    };
  }, [next, t.error, t.taken]);

  const localHost = typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  return (
    <div>
      {localHost ? <p className="note">{t.telegramLocal}</p> : <div ref={host} />}
      {message && <p className="warn" role="alert">{message}</p>}
    </div>
  );
}

function CabinetBar({ locale, screen, fitter }: { locale: Locale; screen: Screen; fitter: boolean }) {
  const t = dict[locale].account;
  const items: [Screen, string, string][] = [
    ['home', '/account', t.title],
    ['body', '/account/body', t.body],
    ['bikes', '/account/bikes', t.bikes],
    ['readings', '/account/readings', t.readings],
  ];
  if (fitter) items.push(['studio', '/studio', t.studioTitle]);
  return (
    <div className="cabinet-bar">
      <nav className="cabinet-tabs" aria-label={t.title}>
        {items.map(([id, path, label]) => (
          <a key={id} href={pathFor(locale, path)} aria-current={screen === id ? 'page' : undefined}>{label}</a>
        ))}
      </nav>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="oauth-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.2 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function YandexMark() {
  return (
    <svg className="oauth-mark" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#FC3F1D" />
      <path fill="#fff" d="M13.4 18h-2.3V9.7H9.6c-1.9 0-2.9 1-2.9 2.4 0 1.2.6 2 1.8 2.8l1 .6-2.9 5.5H4.2l2.6-4.8C5.2 14.8 4.2 13.4 4.2 11.4 4.2 8.4 6.2 6.4 9.7 6.4h3.7V18z" />
    </svg>
  );
}

function Providers({ locale, next }: { locale: Locale; next: string }) {
  const t = dict[locale].account;
  return (
    <>
      <p className="lead">{t.signinLead}</p>
      <div className="oauth">
        <a className="oauth-btn" href={oauthHref('google', next)}>
          <GoogleMark />
          <span>{t.google}</span>
        </a>
        <a className="oauth-btn" href={oauthHref('yandex', next)}>
          <YandexMark />
          <span>{t.yandex}</span>
        </a>
        <TelegramLogin locale={locale} next={next} />
      </div>
    </>
  );
}

function Home({ locale, session, reload }: { locale: Locale; session: Session; reload: () => void }) {
  const t = dict[locale].account;
  const names = PROVIDER_NAMES[locale];
  const here = pathFor(locale, '/account');
  const me = session.state === 'in' ? session.me : null;
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'' | 'saved' | 'error'>('');

  useEffect(() => {
    if (me) setName(me.name);
  }, [me?.name]);

  if (session.state === 'loading') return <Wheel label={t.cabinetLoading} />;
  if (session.state === 'error') return <p className="warn" role="alert">{t.error}</p>;

  if (!me) {
    return (
      <>
        <Providers locale={locale} next={here} />
      </>
    );
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setStatus('');
    try {
      const res = await cabinetFetch('/me', { method: 'PUT', body: JSON.stringify({ name: name.trim() }) });
      setStatus(res.ok ? 'saved' : 'error');
      if (res.ok) reload();
    } catch {
      setStatus('error');
    }
  }

  async function logout() {
    try {
      await cabinetFetch('/auth/logout', { method: 'POST' });
    } catch {
      /* всё равно перезагрузим состояние */
    }
    reload();
  }

  async function remove() {
    if (!confirm(t.deleteConfirm)) return;
    try {
      const res = await cabinetFetch('/me', { method: 'DELETE' });
      if (res.ok) reload();
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  const missing = (['google', 'yandex', 'telegram'] as Provider[]).filter((p) => !me.providers.includes(p));

  return (
    <>
      <p className="lead">{t.leadIn}</p>
      <form onSubmit={saveName}>
        <label>
          {t.name}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </label>
        <button className="button" type="submit">{t.save}</button>
        {status === 'saved' && <p className="note" role="status">{t.saved}</p>}
        {status === 'error' && <p className="warn" role="alert">{t.error}</p>}
      </form>
      <p className="note">{me.email || t.noEmail}</p>
      <p className="note">{me.providers.map((p) => names[p as Provider] ?? p).join(', ')}</p>
      {missing.includes('google') && (
        <p><a className="button ghost" href={oauthHref('google', here)}>{t.connect}: {names.google}</a></p>
      )}
      {missing.includes('yandex') && (
        <p><a className="button ghost" href={oauthHref('yandex', here)}>{t.connect}: {names.yandex}</a></p>
      )}
      {missing.includes('telegram') && <TelegramLogin locale={locale} next={here} />}
      <p>
        <button className="button ghost" type="button" onClick={logout}>{t.logout}</button>
      </p>
      <p>
        <button className="button ghost" type="button" onClick={remove}>{t.delete}</button>
      </p>
    </>
  );
}

function Body({ locale, me, onRider }: { locale: Locale; me: Me; onRider: (rider: RiderId | '') => void }) {
  const t = dict[locale].account;
  const [rider, setRider] = useState<string>(me.profile?.rider ?? '');
  const [height, setHeight] = useState(showNum(me.profile?.height_cm ?? null));
  const [inseam, setInseam] = useState(showNum(me.profile?.inseam_cm ?? null));
  const [status, setStatus] = useState<'' | 'saving' | 'saved' | 'error'>('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');
    const heightCm = parseInt0(height);
    const inseamCm = parseInt0(inseam);
    if (heightCm === undefined || inseamCm === undefined) {
      setStatus('error');
      return;
    }
    try {
      const res = await cabinetFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({ rider: rider || null, height_cm: heightCm, inseam_cm: inseamCm }),
      });
      setStatus(res.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset className="rider-pick">
        <legend>{t.rider}</legend>
        {RIDER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="rider-card"
            data-rider={id}
            role="radio"
            aria-checked={rider === id}
            onClick={() => {
              setRider(id);
              onRider(id);
            }}
          >
            {t[id]}
          </button>
        ))}
      </fieldset>
      <p className="note">{t.riderLook}</p>
      <label>
        {t.height}
        <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
      </label>
      <p className="note">{t.inseamHelp}</p>
      <label>
        {t.inseam}
        <input inputMode="numeric" value={inseam} onChange={(e) => setInseam(e.target.value)} />
      </label>
      <button className="button" type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? <Wheel /> : t.save}
      </button>
      {status === 'saved' && <p className="note" role="status">{t.saved}</p>}
      {status === 'error' && <p className="warn" role="alert">{t.error}</p>}
    </form>
  );
}

function Bikes({ locale }: { locale: Locale }) {
  const t = dict[locale].account;
  const [list, setList] = useState<Bike[] | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [fit, setFit] = useState<FitId>('endurance');
  const [crank, setCrank] = useState('');
  const [saddle, setSaddle] = useState('');
  const [stem, setStem] = useState('');
  const [drop, setDrop] = useState('');
  const [status, setStatus] = useState<'' | 'saved' | 'error' | 'limit'>('');
  const [problems, setProblems] = useState<Partial<Record<'crank' | 'saddle' | 'stem' | 'drop', string>>>({});

  async function load() {
    try {
      const res = await cabinetFetch('/bikes');
      const data = await readJson<Bike[]>(res);
      if (res.ok && Array.isArray(data)) setList(data);
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function reset() {
    setEditing(null);
    setName('');
    setFit('endurance');
    setCrank('');
    setSaddle('');
    setStem('');
    setDrop('');
    setProblems({});
  }

  function edit(bike: Bike) {
    setEditing(bike.id);
    setName(bike.name);
    setFit(bike.fit);
    setCrank(showNum(bike.crank_mm));
    setSaddle(showNum(bike.saddle_mm));
    setStem(showNum(bike.stem_mm));
    setDrop(showNum(bike.drop_mm));
    setStatus('');
    setProblems({});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('');
    const fields = [
      ['crank', 'crank_mm', crank],
      ['saddle', 'saddle_mm', saddle],
      ['stem', 'stem_mm', stem],
      ['drop', 'drop_mm', drop],
    ] as const;
    const next: Partial<Record<(typeof fields)[number][0], string>> = {};
    const sizes: (number | null)[] = [];
    for (const [name, key, raw] of fields) {
      const parsed = parseMmInput(raw);
      if (parsed === undefined || !mmFits(key as BikeMmKey, parsed ?? null)) {
        const suggested = cmSuggestion(key as BikeMmKey, raw);
        next[name] = suggested ? `${t.mmRange[name]} ${t.mmCm.replace('{mm}', String(suggested))}` : t.mmRange[name];
        continue;
      }
      sizes.push(parsed);
    }
    setProblems(next);
    if (Object.keys(next).length > 0) return;
    const [crankMm, saddleMm, stemMm, dropMm] = sizes;
    const body = JSON.stringify({
      name: name.trim(),
      fit,
      crank_mm: crankMm,
      saddle_mm: saddleMm,
      stem_mm: stemMm,
      drop_mm: dropMm,
    });
    try {
      const res =
        editing === null
          ? await cabinetFetch('/bikes', { method: 'POST', body })
          : await cabinetFetch(`/bikes/${editing}`, { method: 'PUT', body });
      if (res.ok) {
        reset();
        setStatus('saved');
        await load();
        return;
      }
      const data = await readJson<{ error?: string }>(res);
      setStatus(data?.error === 'limit' ? 'limit' : 'error');
    } catch {
      setStatus('error');
    }
  }

  async function remove(id: number) {
    try {
      const res = await cabinetFetch(`/bikes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      if (editing === id) reset();
      await load();
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      {list && list.length === 0 && <p className="note">{t.empty}</p>}
      {list && list.length > 0 && (
        <ul>
          {list.map((bike) => (
            <li key={bike.id}>
              <button className="button ghost" type="button" onClick={() => edit(bike)}>{bike.name}</button>
              {' · '}
              {t[bike.fit]}
              {' · '}
              {[bike.crank_mm, bike.saddle_mm, bike.stem_mm, bike.drop_mm].map((v) => (v === null ? '—' : v)).join(' / ')}
              {' '}
              <button className="button ghost" type="button" onClick={() => remove(bike.id)}>{t.remove}</button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit}>
        <label>
          {t.bikeName}
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
        </label>
        <Pick
          label={t.fit}
          value={fit}
          options={FIT_IDS.map((id) => ({ value: id, label: t[id] }))}
          onChange={(next) => setFit(next as FitId)}
        />
        <label>
          <span className="field-label">{t.crank}<MeasureHint locale={locale} kind="crank" /></span>
          <input inputMode="decimal" placeholder="170" aria-invalid={Boolean(problems.crank)} className={problems.crank ? 'is-bad' : undefined} value={crank} onChange={(e) => setCrank(e.target.value)} />
          {problems.crank && <span className="field-error" role="alert">{problems.crank}</span>}
        </label>
        <label>
          <span className="field-label">{t.saddle}<MeasureHint locale={locale} kind="saddle" /></span>
          <input inputMode="decimal" placeholder="740" aria-invalid={Boolean(problems.saddle)} className={problems.saddle ? 'is-bad' : undefined} value={saddle} onChange={(e) => setSaddle(e.target.value)} />
          {problems.saddle && <span className="field-error" role="alert">{problems.saddle}</span>}
        </label>
        <label>
          <span className="field-label">{t.stem}<MeasureHint locale={locale} kind="stem" /></span>
          <input inputMode="decimal" placeholder="90" aria-invalid={Boolean(problems.stem)} className={problems.stem ? 'is-bad' : undefined} value={stem} onChange={(e) => setStem(e.target.value)} />
          {problems.stem && <span className="field-error" role="alert">{problems.stem}</span>}
        </label>
        <label>
          <span className="field-label">{t.drop}<MeasureHint locale={locale} kind="drop" /></span>
          <input inputMode="decimal" placeholder="40" aria-invalid={Boolean(problems.drop)} className={problems.drop ? 'is-bad' : undefined} value={drop} onChange={(e) => setDrop(e.target.value)} />
          {problems.drop && <span className="field-error" role="alert">{problems.drop}</span>}
        </label>
        <button className="button" type="submit">{editing === null ? t.addBike : t.save}</button>
        {editing !== null && (
          <button className="button ghost" type="button" onClick={reset}>{t.addBike}</button>
        )}
        {status === 'saved' && <p className="note" role="status">{t.saved}</p>}
        {status === 'error' && <p className="warn" role="alert">{t.error}</p>}
        {status === 'limit' && <p className="warn" role="alert">{t.limit}</p>}
      </form>
      <p className="note">{t.bikeNote}</p>
    </>
  );
}

const ANGLE_SIZE = { knee: 'saddle', back: 'drop', arm: 'stem', hip: 'crank' } as const;

function readingDate(locale: Locale, value: string | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB');
}

function sizeText(locale: Locale, value: number | null) {
  const t = dict[locale].account;
  return value === null ? t.readingMissing : `${value} ${locale === 'ru' ? 'мм' : 'mm'}`;
}

function ReadingDetail({ locale, row, setup }: { locale: Locale; row: ReadingRow; setup: ReadingSetup }) {
  const t = dict[locale].account;
  const copy = dict[locale];
  const showSizes = setup.source !== 'none';
  return (
    <div className="reading-detail">
      <p className="reading-meta">
        {row.user_name ? `${row.user_name} · ` : ''}
        {readingDate(locale, row.created_at)}
        {readingDate(locale, row.created_at) ? ' · ' : ''}
        {t[row.fit]}
        {row.bike_name ? ` · ${row.bike_name}` : ''}
      </p>
      {setup.source === 'today' && <p className="note">{t.readingToday}</p>}
      {setup.source === 'none' && <p className="note">{t.readingNone}</p>}
      <div className="angles">
        {ANGLES.map((key) => {
          const value = row[key];
          const sizeKey = ANGLE_SIZE[key];
          const sizes = { saddle: setup.saddleMm, drop: setup.dropMm, stem: setup.stemMm, crank: setup.crankMm };
          const size = sizes[sizeKey];
          const missing = value === null;
          const zone = missing ? null : bandFor(key, value);
          const words = missing
            ? (key === 'hip' && !row.had_top ? copy.analyze.hipMissing : copy.analyze.notVisible)
            : copy.advice[key][zone!];
          return (
            <article key={key} className={`readout ${zone ?? 'muted-readout'}`}>
              <b>{missing ? '—' : `${value}°`}</b>
              <span>
                <strong>{copy.angles[key].label}</strong>
                {words}
                {showSizes && <small>{t[sizeKey]}: {sizeText(locale, size)}</small>}
              </span>
            </article>
          );
        })}
      </div>
      {showSizes && (
        <p className="reading-meta">
          {t.rider}: {setup.rider ? t[setup.rider] : t.readingMissing}
          {' · '}
          {t.height}: {setup.heightCm === null ? t.readingMissing : `${setup.heightCm} ${locale === 'ru' ? 'см' : 'cm'}`}
          {' · '}
          {t.inseam}: {setup.inseamCm === null ? t.readingMissing : `${setup.inseamCm} ${locale === 'ru' ? 'см' : 'cm'}`}
        </p>
      )}
    </div>
  );
}

function ReadingList({
  locale,
  rows,
  live,
  onRemove,
}: {
  locale: Locale;
  rows: ReadingRow[];
  live: { profile: Me['profile']; bikes: Bike[] } | null;
  onRemove?: (id: number) => void;
}) {
  const t = dict[locale].account;
  const angles = dict[locale].angles;
  const [openId, setOpenId] = useState<number | null>(null);
  const open = rows.find((row) => row.id === openId);
  if (rows.length === 0) return <p className="note">{t.empty}</p>;
  if (open) {
    const setup = readingSetup(
      {
        captured: open.captured,
        bikeId: open.bike_id,
        rider: open.rider,
        heightCm: open.height_cm,
        inseamCm: open.inseam_cm,
        crankMm: open.crank_mm,
        saddleMm: open.saddle_mm,
        stemMm: open.stem_mm,
        dropMm: open.drop_mm,
      },
      live && {
        profile: live.profile && {
          rider: live.profile.rider,
          heightCm: live.profile.height_cm,
          inseamCm: live.profile.inseam_cm,
        },
        bikes: live.bikes.map((bike) => ({
          id: bike.id,
          crankMm: bike.crank_mm,
          saddleMm: bike.saddle_mm,
          stemMm: bike.stem_mm,
          dropMm: bike.drop_mm,
        })),
      },
    );
    return (
      <>
        <p><button className="button ghost" type="button" onClick={() => setOpenId(null)}>{t.readingBack}</button></p>
        <ReadingDetail locale={locale} row={open} setup={setup} />
        {onRemove && <p><button className="button ghost" type="button" onClick={() => onRemove(open.id)}>{t.remove}</button></p>}
      </>
    );
  }
  return (
    <ul className="reading-list">
      {rows.map((row) => (
        <li key={row.id} className="reading-item">
          <button className="reading-open" type="button" onClick={() => setOpenId(row.id)}>
            <strong>
              {row.user_name ? `${row.user_name} · ` : ''}
              {readingDate(locale, row.created_at)}
              {readingDate(locale, row.created_at) ? ' · ' : ''}
              {t[row.fit]}
              {row.bike_name ? ` · ${row.bike_name}` : ''}
            </strong>
            <span>{ANGLES.map((key) => `${angles[key].label} ${row[key] === null ? '—' : `${row[key]}°`}`).join(' · ')}</span>
          </button>
          {onRemove && <button className="button ghost" type="button" onClick={() => onRemove(row.id)}>{t.remove}</button>}
        </li>
      ))}
    </ul>
  );
}

function Readings({ locale, profile }: { locale: Locale; profile: Me['profile'] }) {
  const t = dict[locale].account;
  const [rows, setRows] = useState<ReadingRow[] | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [failed, setFailed] = useState(false);

  async function load() {
    try {
      const [readingRes, bikeRes] = await Promise.all([cabinetFetch('/readings'), cabinetFetch('/bikes')]);
      const data = await readJson<ReadingRow[]>(readingRes);
      const bikeData = await readJson<Bike[]>(bikeRes);
      if (readingRes.ok && Array.isArray(data)) {
        setRows(data);
        setBikes(bikeRes.ok && Array.isArray(bikeData) ? bikeData : []);
        setFailed(false);
      } else setFailed(true);
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: number) {
    try {
      const res = await cabinetFetch(`/readings/${id}`, { method: 'DELETE' });
      if (res.ok) await load();
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      {failed && <p className="warn" role="alert">{t.error}</p>}
      {rows && <ReadingList locale={locale} rows={rows} live={{ profile, bikes }} onRemove={remove} />}
    </>
  );
}

function Studio({ locale }: { locale: Locale }) {
  const t = dict[locale].account;
  const [rows, setRows] = useState<ReadingRow[] | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await cabinetFetch('/studio');
        if (!alive) return;
        if (res.status === 403) {
          setState('denied');
          return;
        }
        const data = await readJson<ReadingRow[]>(res);
        if (res.ok && Array.isArray(data)) {
          setRows(data);
          setState('ok');
        } else setState('error');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'denied') {
    return (
      <>
        <p className="warn">{t.studioDenied}</p>
        <p><a className="button ghost" href={pathFor(locale, '/account')}>{t.toAccount}</a></p>
      </>
    );
  }
  if (state === 'error') return <p className="warn" role="alert">{t.error}</p>;
  if (state === 'ok' && rows) return <ReadingList locale={locale} rows={rows} live={null} />;
  return null;
}

export default function Cabinet({ locale, screen }: { locale: Locale; screen: Screen }) {
  const t = dict[locale].account;
  const enabled = apiUrl() !== '';
  const [session, setSession] = useState<Session>({ state: 'loading' });
  const [riderLook, setRiderLook] = useState<RiderId | ''>(() => readRiderLook());

  function chooseRider(rider: RiderId | '') {
    setRiderLook(rider);
    writeRiderLook(rider);
  }

  async function load() {
    try {
      const res = await cabinetFetch('/me');
      if (res.status === 401) {
        setSession({ state: 'out' });
        return;
      }
      const data = await readJson<Me>(res);
      if (res.ok && data) {
        setSession({ state: 'in', me: data });
        if (data.profile?.rider) chooseRider(data.profile.rider);
      } else {
        setSession({ state: 'error' });
      }
    } catch {
      setSession({ state: 'error' });
    }
  }

  useEffect(() => {
    if (enabled) void load();
  }, [enabled]);

  if (!enabled) return <p className="note">{t.unavailable}</p>;

  const fitter = session.state === 'in' && session.me.role === 'fitter';
  const bar = <CabinetBar locale={locale} screen={screen} fitter={fitter} />;
  const shell = (children: ReactNode) => (
    <div className="cabinet" data-rider={riderLook || 'adult'}>{children}</div>
  );

  if (screen === 'signin') {
    if (session.state === 'in') {
      return <p className="lead"><a href={pathFor(locale, '/account')}>{session.me.name}</a></p>;
    }
    if (session.state === 'loading') return <Wheel label={t.cabinetLoading} />;
    return <Providers locale={locale} next={pathFor(locale, '/account')} />;
  }

  if (screen === 'home') {
    return shell(
      <>
        {session.state === 'in' && bar}
        <Home locale={locale} session={session} reload={load} />
      </>,
    );
  }

  if (session.state === 'loading') return shell(<><CabinetBar locale={locale} screen={screen} fitter={false} /><Wheel label={t.cabinetLoading} /></>);
  if (session.state === 'error') {
    return shell(
      <>
        {bar}
        <p className="warn" role="alert">{t.error}</p>
      </>,
    );
  }
  if (session.state === 'out') {
    return shell(
      <>
        {bar}
        <p className="lead">{t.leadOut}</p>
        <p><a className="button" href={pathFor(locale, '/account')}>{t.title}</a></p>
      </>,
    );
  }

  return shell(
    <>
      {bar}
      {screen === 'body' && <Body locale={locale} me={session.me} onRider={chooseRider} />}
      {screen === 'bikes' && <Bikes locale={locale} />}
      {screen === 'readings' && <Readings locale={locale} profile={session.me.profile} />}
      {screen === 'studio' && <Studio locale={locale} />}
    </>,
  );
}
