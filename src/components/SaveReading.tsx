import { useEffect, useState, type FormEvent } from 'react';
import { dict, type Locale } from '../i18n';
import { subscribeBikes, type SavedBike } from '../lib/bike-sync';
import { apiUrl, cabinetFetch } from '../lib/cabinet-client';
import { pathFor } from '../lib/paths';
import type { AngleReading } from '../lib/reading';
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
}: {
  locale: Locale;
  reading: AngleReading;
  hadTop: boolean;
  onBike?: (bike: SavedBike | null) => void;
}) {
  const t = dict[locale].account;
  const enabled = apiUrl() !== '';
  const [phase, setPhase] = useState<'loading' | 'out' | 'ready' | 'error'>(enabled ? 'loading' : 'ready');
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [choice, setChoice] = useState('');
  const [status, setStatus] = useState<'' | 'saved' | 'error' | 'limit'>('');
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
          setPhase('error');
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
    if (phase !== 'ready') return;
    const selected = choice ? bikes.find((item) => String(item.id) === choice) ?? null : null;
    onBike?.(selected);
  }, [phase, choice, bikes, onBike]);

  if (!enabled) return <p className="note">{t.unavailable}</p>;

  if (phase === 'out') {
    const href = pathFor(locale, '/account') + '?next=' + encodeURIComponent(pathFor(locale, '/analyze'));
    return (
      <p>
        <a className="button" href={href}>{t.saveReading}</a>
      </p>
    );
  }

  if (phase === 'loading') return null;
  if (phase === 'error') return <p className="warn" role="alert">{t.error}</p>;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus('');
    const selected = bikes.find((bike) => String(bike.id) === choice);
    const body = {
      fit: selected?.fit ?? 'endurance',
      bike_id: selected ? selected.id : null,
      knee: round(reading.knee),
      back: round(reading.back),
      arm: round(reading.arm),
      hip: round(reading.hip),
      had_top: hadTop,
    };
    try {
      const res = await cabinetFetch('/readings', { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) {
        setStatus('saved');
        return;
      }
      const data = await readJson<{ error?: string }>(res);
      setStatus(data?.error === 'limit' ? 'limit' : 'error');
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
    <form className="save-reading" onSubmit={submit}>
      <div className="save-bike">
        <Pick label={t.pickBike} value={choice} options={options} onChange={setChoice} />
        {subscription ? (
          <button className="button ghost" type="button" onClick={() => setDialog(true)}>{dict[locale].analyze.addBike}</button>
        ) : null}
      </div>
      <button className="button" type="submit">{t.saveReading}</button>
      {status === 'saved' && <p className="note" role="status">{t.saved}</p>}
      {status === 'error' && <p className="warn" role="alert">{t.error}</p>}
      {status === 'limit' && <p className="warn" role="alert">{t.limit}</p>}
    </form>
    <BikeDialog locale={locale} open={dialog} onClose={() => setDialog(false)} />
    </>
  );
}
