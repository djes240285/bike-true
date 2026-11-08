import { useEffect, useState, type FormEvent } from 'react';
import { dict, type Locale } from '../i18n';
import { subscribeBikes, type SavedBike } from '../lib/bike-sync';
import { apiUrl, cabinetFetch } from '../lib/cabinet-client';
import type { PersonOverhead } from '../lib/account';
import type { BodyLayer } from '../lib/layers';
import type { SitterDraft } from '../lib/device';
import { pathFor } from '../lib/paths';
import type { AngleReading } from '../lib/reading';
import type { FitId } from '../lib/fits';
import BikeDialog from './BikeDialog';
import Pick from './Pick';

type Bike = SavedBike;

function round(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function SaveReading({
  locale,
  reading,
  hadTop,
  onBike,
  body,
  overhead,
  fit = null,
  canSave,
  sitter,
}: {
  locale: Locale;
  reading: AngleReading;
  hadTop: boolean;
  onBike?: (bike: SavedBike | null) => void;
  body?: BodyLayer;
  overhead?: PersonOverhead | null;
  fit?: FitId | null;
  canSave: boolean;
  sitter?: SitterDraft;
}) {
  const t = dict[locale].account;
  const enabled = apiUrl() !== '';
  const [phase, setPhase] = useState<'loading' | 'out' | 'ready' | 'error' | 'database'>(enabled ? 'loading' : 'ready');
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [choice, setChoice] = useState('');
  const [status, setStatus] = useState<'' | 'saved' | 'error' | 'limit' | 'database'>('');
  const [subscription, setSubscription] = useState(false);
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    let cancel = false;
    void fetch('/api/flags')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subscriptionEnabled?: boolean } | null) => {
        if (!cancel) setSubscription(data?.subscriptionEnabled === true);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => subscribeBikes((bike) => {
    setBikes((rows) => [bike, ...rows.filter((item) => item.id !== bike.id)]);
    setChoice(String(bike.id));
    setDialog(false);
  }), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      try {
        const me = await cabinetFetch('/me');
        if (!alive) return;
        if (me.status === 401) {
          setPhase('out');
          return;
        }
        if (!me.ok) {
          const problem = await readJson<{ error?: string }>(me);
          setPhase(problem?.error === 'database' ? 'database' : 'error');
          return;
        }
        const res = await cabinetFetch('/bikes');
        if (!alive) return;
        const data = await readJson<Bike[]>(res);
        if (!res.ok || !Array.isArray(data)) {
          setPhase('error');
          return;
        }
        setBikes(data);
        setChoice(data.length > 0 ? String(data[0].id) : '');
        setPhase('ready');
      } catch {
        if (alive) setPhase('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  useEffect(() => {
    const header = document.querySelector('.top');
    if (!header) return undefined;
    const apply = () => {
      document.documentElement.style.setProperty('--top-height', `${header.getBoundingClientRect().height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== 'ready') return;
    const selected = choice ? bikes.find((item) => String(item.id) === choice) ?? null : null;
    onBike?.(selected);
  }, [phase, choice, bikes, onBike]);

  if (!enabled) return canSave ? <p className="note">{t.unavailable}</p> : null;

  if (phase === 'out') {
    if (!canSave) return null;
    const href = pathFor(locale, '/account') + '?next=' + encodeURIComponent(pathFor(locale, '/analyze'));
    return (
      <p className="bike-dock">
        <BikeGlyph />
        <a className="bike-dock-signin" href={href}>{t.saveReading}</a>
      </p>
    );
  }

  if (phase === 'loading') return null;
  if (phase === 'database') return <p className="warn" role="alert">{t.database}</p>;
  if (phase === 'error') return canSave ? <p className="warn" role="alert">{t.error}</p> : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('');
    const selected = bikes.find((bike) => String(bike.id) === choice);
    const hasAngle = [reading.knee, reading.back, reading.arm, reading.hip].some((value) => value !== null);
    const friend = sitter?.who === 'other' ? sitter.other : null;
    const height = friend ? Number(friend.height) : null;
    const person: Record<string, unknown> = {};
    if (!friend && (body?.posterior || body?.hip || body?.ankle || body?.shoulder)) {
      person.posterior = body.posterior ?? null;
      person.hip = body.hip ?? null;
      person.ankle = body.ankle ?? null;
      person.shoulder = body.shoulder ?? null;
    }
    if (!friend && overhead) person.overhead = overhead;
    try {
      if (hasAngle) {
        const payload = {
          fit: fit ?? selected?.fit ?? 'endurance',
          bike_id: selected ? selected.id : null,
          knee: round(reading.knee),
          back: round(reading.back),
          arm: round(reading.arm),
          hip: round(reading.hip),
          had_top: hadTop,
          ...(friend ? {
            for_other: true,
            height_cm: height !== null && height >= 90 && height <= 220 ? height : null,
            sitter_name: friend.name.trim(),
          } : {}),
        };
        const res = await cabinetFetch('/readings', { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) {
          const data = await readJson<{ error?: string }>(res);
          setStatus(data?.error === 'limit' ? 'limit' : data?.error === 'database' ? 'database' : 'error');
          return;
        }
      }
      if (Object.keys(person).length > 0) {
        const res = await cabinetFetch('/person', { method: 'PUT', body: JSON.stringify(person) });
        if (!res.ok) {
          const data = await readJson<{ error?: string }>(res);
          setStatus(data?.error === 'database' ? 'database' : 'error');
          return;
        }
      }
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  const options = [
    ...bikes.map((bike) => ({ value: String(bike.id), label: bike.name })),
    { value: '', label: t.noBike },
  ];

  return (
    <>
    <form className="bike-dock" onSubmit={submit}>
      <BikeGlyph />
      <Pick compact label={t.pickBike} value={choice} options={options} onChange={setChoice} />
      {status === 'saved' ? <span className="bike-dock-status" role="status">{t.saved}</span> : null}
      {status === 'error' || status === 'limit' || status === 'database' ? <span className="bike-dock-status is-warn" role="alert">{status === 'limit' ? t.limit : status === 'database' ? t.database : t.error}</span> : null}
      {subscription ? (
        <button className="bike-dock-icon" type="button" aria-label={dict[locale].analyze.addBike} onClick={() => setDialog(true)}>
          <PlusGlyph />
        </button>
      ) : null}
      {canSave ? (
        <button className="bike-dock-icon" type="submit" aria-label={t.saveReading}>
          <SaveGlyph />
        </button>
      ) : null}
    </form>
    <BikeDialog locale={locale} open={dialog} onClose={() => setDialog(false)} />
    </>
  );
}

function BikeGlyph() {
  return (
    <svg className="bike-glyph" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="8" cy="23" r="5" />
      <circle cx="24" cy="23" r="5" />
      <path d="M8 23 14 12h7L24 23M14 12 18 23M12.5 10h4M20 10h4" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

function SaveGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10v16l-5-3-5 3z" />
    </svg>
  );
}
