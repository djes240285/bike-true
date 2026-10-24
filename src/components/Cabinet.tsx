import { useEffect, useRef, useState, type FormEvent } from 'react';
import { dict, type Locale } from '../i18n';
import { FIT_IDS, RIDER_IDS, type FitId, type RiderId } from '../lib/fits';
import { pathFor } from '../lib/paths';
import { apiUrl, cabinetFetch } from '../lib/cabinet-client';

type Screen = 'home' | 'body' | 'bikes' | 'readings' | 'studio';
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
  bike_name: string | null;
  fit: FitId;
  knee: number | null;
  back: number | null;
  arm: number | null;
  hip: number | null;
  had_top: boolean;
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

function currentNext(locale: Locale): string {
  const fallback = pathFor(locale, '/account');
  if (typeof location === 'undefined') return fallback;
  const raw = new URLSearchParams(location.search).get('next');
  // Только для показа в ссылке: сервер всё равно прогоняет через cabinetNext.
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback;
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
        script.setAttribute('data-request-access', 'write');
        host.current.appendChild(script);
      } catch {
        /* виджета нет — остаются другие входы */
      }
    })();
    return () => {
      alive = false;
      delete win.onBikeTrueTelegram;
    };
  }, [next, t.taken, t.error]);

  return (
    <div>
      <div ref={host} />
      {message && <p className="warn" role="alert">{message}</p>}
    </div>
  );
}

function Links({ locale, screen, fitter }: { locale: Locale; screen: Screen; fitter: boolean }) {
  const t = dict[locale].account;
  const items: [Screen, string, string][] = [
    ['home', '/account', t.title],
    ['body', '/account/body', t.body],
    ['bikes', '/account/bikes', t.bikes],
    ['readings', '/account/readings', t.readings],
  ];
  if (fitter) items.push(['studio', '/studio', t.studioTitle]);
  return (
    <p className="note">
      {items.map(([id, path, label], index) => (
        <span key={id}>
          {index > 0 && ' · '}
          <a href={pathFor(locale, path)} aria-current={screen === id ? 'page' : undefined}>{label}</a>
        </span>
      ))}
    </p>
  );
}

function Home({ locale, session, reload }: { locale: Locale; session: Session; reload: () => void }) {
  const t = dict[locale].account;
  const names = PROVIDER_NAMES[locale];
  const [next] = useState(() => currentNext(locale));
  const here = pathFor(locale, '/account');
  const me = session.state === 'in' ? session.me : null;
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'' | 'saved' | 'error'>('');

  useEffect(() => {
    if (me) setName(me.name);
  }, [me?.name]);

  if (session.state === 'loading') return null;
  if (session.state === 'error') return <p className="warn" role="alert">{t.error}</p>;

  if (!me) {
    return (
      <>
        <p className="lead">{t.leadOut}</p>
        <p><a className="button" href={oauthHref('google', next)}>{t.google}</a></p>
        <p><a className="button" href={oauthHref('yandex', next)}>{t.yandex}</a></p>
        <TelegramLogin locale={locale} next={next} />
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

function Body({ locale, me }: { locale: Locale; me: Me }) {
  const t = dict[locale].account;
  const [rider, setRider] = useState<string>(me.profile?.rider ?? '');
  const [height, setHeight] = useState(showNum(me.profile?.height_cm ?? null));
  const [inseam, setInseam] = useState(showNum(me.profile?.inseam_cm ?? null));
  const [status, setStatus] = useState<'' | 'saved' | 'error'>('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('');
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
      <label>
        {t.rider}
        <select value={rider} onChange={(e) => setRider(e.target.value)}>
          <option value="" />
          {RIDER_IDS.map((id) => (
            <option key={id} value={id}>{t[id]}</option>
          ))}
        </select>
      </label>
      <label>
        {t.height}
        <input inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
      </label>
      <p className="note">{t.inseamHelp}</p>
      <label>
        {t.inseam}
        <input inputMode="numeric" value={inseam} onChange={(e) => setInseam(e.target.value)} />
      </label>
      <button className="button" type="submit">{t.save}</button>
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
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('');
    const sizes = [parseInt0(crank), parseInt0(saddle), parseInt0(stem), parseInt0(drop)];
    if (sizes.some((value) => value === undefined)) {
      setStatus('error');
      return;
    }
    const [crankMm, saddleMm, stemMm, dropMm] = sizes as (number | null)[];
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
        <label>
          {t.fit}
          <select value={fit} onChange={(e) => setFit(e.target.value as FitId)}>
            {FIT_IDS.map((id) => (
              <option key={id} value={id}>{t[id]}</option>
            ))}
          </select>
        </label>
        <label>
          {t.crank}
          <input inputMode="numeric" value={crank} onChange={(e) => setCrank(e.target.value)} />
        </label>
        <label>
          {t.saddle}
          <input inputMode="numeric" value={saddle} onChange={(e) => setSaddle(e.target.value)} />
        </label>
        <label>
          {t.stem}
          <input inputMode="numeric" value={stem} onChange={(e) => setStem(e.target.value)} />
        </label>
        <label>
          {t.drop}
          <input inputMode="numeric" value={drop} onChange={(e) => setDrop(e.target.value)} />
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

function ReadingList({ locale, rows, onRemove }: { locale: Locale; rows: ReadingRow[]; onRemove?: (id: number) => void }) {
  const t = dict[locale].account;
  const angles = dict[locale].angles;
  if (rows.length === 0) return <p className="note">{t.empty}</p>;
  return (
    <ul>
      {rows.map((row) => (
        <li key={row.id}>
          {row.user_name && <strong>{row.user_name} · </strong>}
          {row.created_at && <span>{new Date(row.created_at).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB')} · </span>}
          {t[row.fit]}
          {row.bike_name ? ` · ${row.bike_name}` : ''}
          {' · '}
          {ANGLES.map((key) => `${angles[key].label} ${row[key] === null ? '—' : `${row[key]}°`}`).join(', ')}
          {onRemove && (
            <>
              {' '}
              <button className="button ghost" type="button" onClick={() => onRemove(row.id)}>{t.remove}</button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function Readings({ locale }: { locale: Locale }) {
  const t = dict[locale].account;
  const [rows, setRows] = useState<ReadingRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  async function load() {
    try {
      const res = await cabinetFetch('/readings');
      const data = await readJson<ReadingRow[]>(res);
      if (res.ok && Array.isArray(data)) {
        setRows(data);
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
      {rows && <ReadingList locale={locale} rows={rows} onRemove={remove} />}
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
  if (state === 'ok' && rows) return <ReadingList locale={locale} rows={rows} />;
  return null;
}

export default function Cabinet({ locale, screen }: { locale: Locale; screen: Screen }) {
  const t = dict[locale].account;
  const enabled = apiUrl() !== '';
  const [session, setSession] = useState<Session>({ state: 'loading' });

  async function load() {
    try {
      const res = await cabinetFetch('/me');
      if (res.status === 401) {
        setSession({ state: 'out' });
        return;
      }
      const data = await readJson<Me>(res);
      setSession(res.ok && data ? { state: 'in', me: data } : { state: 'error' });
    } catch {
      setSession({ state: 'error' });
    }
  }

  useEffect(() => {
    if (enabled) void load();
  }, [enabled]);

  if (!enabled) return <p className="note">{t.unavailable}</p>;

  const fitter = session.state === 'in' && session.me.role === 'fitter';
  const links = <Links locale={locale} screen={screen} fitter={fitter} />;

  if (screen === 'home') {
    return (
      <>
        {links}
        <Home locale={locale} session={session} reload={load} />
      </>
    );
  }

  if (session.state === 'loading') return links;
  if (session.state === 'error') {
    return (
      <>
        {links}
        <p className="warn" role="alert">{t.error}</p>
      </>
    );
  }
  if (session.state === 'out') {
    return (
      <>
        {links}
        <p className="lead">{t.leadOut}</p>
        <p><a className="button" href={pathFor(locale, '/account')}>{t.title}</a></p>
      </>
    );
  }

  return (
    <>
      {links}
      {screen === 'body' && <Body locale={locale} me={session.me} />}
      {screen === 'bikes' && <Bikes locale={locale} />}
      {screen === 'readings' && <Readings locale={locale} />}
      {screen === 'studio' && <Studio locale={locale} />}
    </>
  );
}
