import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { dict, type Locale } from '../i18n';
import { cmSuggestion, mmFits, parseMmInput, type BikeMmKey } from '../lib/account';
import { publishBike, type SavedBike } from '../lib/bike-sync';
import { cabinetFetch } from '../lib/cabinet-client';
import { FIT_IDS, type FitId } from '../lib/fits';
import MeasureHint from './MeasureHint';
import Pick from './Pick';

type Field = 'crank' | 'saddle' | 'stem' | 'drop';

export default function BikeDialog({
  locale,
  open,
  onClose,
}: {
  locale: Locale;
  open: boolean;
  onClose: () => void;
}) {
  const copy = dict[locale].analyze;
  const account = dict[locale].account;
  const [name, setName] = useState('');
  const [fit, setFit] = useState<FitId>('endurance');
  const [crank, setCrank] = useState('');
  const [saddle, setSaddle] = useState('');
  const [stem, setStem] = useState('');
  const [drop, setDrop] = useState('');
  const [problems, setProblems] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState('');

  if (!open || typeof document === 'undefined') return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const fields = [
      ['crank', 'crank_mm', crank],
      ['saddle', 'saddle_mm', saddle],
      ['stem', 'stem_mm', stem],
      ['drop', 'drop_mm', drop],
    ] as const;
    const next: Partial<Record<Field, string>> = {};
    const sizes: Array<number | null> = [];
    for (const [field, key, raw] of fields) {
      const parsed = parseMmInput(raw);
      if (parsed === undefined || !mmFits(key as BikeMmKey, parsed ?? null)) {
        const suggested = cmSuggestion(key as BikeMmKey, raw);
        next[field] = suggested ? `${account.mmRange[field]} ${account.mmCm.replace('{mm}', String(suggested))}` : account.mmRange[field];
        continue;
      }
      sizes.push(parsed);
    }
    setProblems(next);
    if (Object.keys(next).length > 0) return;
    const [crankMm, saddleMm, stemMm, dropMm] = sizes;
    const trimmed = name.trim();
    const res = await cabinetFetch('/bikes', {
      method: 'POST',
      body: JSON.stringify({
        name: trimmed,
        fit,
        crank_mm: crankMm,
        saddle_mm: saddleMm,
        stem_mm: stemMm,
        drop_mm: dropMm,
      }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; bike?: SavedBike } | null;
    let bike = data?.bike;
    if (res.ok && !bike?.id) {
      const list = await cabinetFetch('/bikes');
      const rows = list.ok ? ((await list.json()) as SavedBike[]) : [];
      bike = rows.find((item) => item.name === trimmed);
    }
    if (!res.ok || !bike?.id) {
      setError(data?.error === 'limit' ? copy.bikeLimit : copy.bikeError);
      return;
    }
    publishBike(bike);
    setName('');
    setFit('endurance');
    setCrank('');
    setSaddle('');
    setStem('');
    setDrop('');
    setProblems({});
    onClose();
  }

  const field = (key: Field, value: string, set: (next: string) => void, hint: Field) => (
    <label>
      <span className="field-label">{account[key]}<MeasureHint locale={locale} kind={hint} /></span>
      <input
        inputMode="decimal"
        value={value}
        aria-invalid={Boolean(problems[key])}
        className={problems[key] ? 'is-bad' : undefined}
        onChange={(event) => set(event.target.value)}
      />
      {problems[key] ? <span className="field-error" role="alert">{problems[key]}</span> : null}
    </label>
  );

  return createPortal(
    <div className="film-dialog" role="dialog" aria-modal="true" aria-labelledby="bike-dialog-title">
      <form onSubmit={(event) => void submit(event)}>
        <h3 id="bike-dialog-title">{copy.bikeDialog}</h3>
        <p>{copy.bikeDialogLead}</p>
        <label>
          {account.bikeName}
          <input value={name} maxLength={40} required onChange={(event) => setName(event.target.value)} />
        </label>
        <Pick
          label={account.fit}
          value={fit}
          options={FIT_IDS.map((id) => ({ value: id, label: account[id] }))}
          onChange={(next) => setFit(next as FitId)}
        />
        {field('crank', crank, setCrank, 'crank')}
        {field('saddle', saddle, setSaddle, 'saddle')}
        {field('stem', stem, setStem, 'stem')}
        {field('drop', drop, setDrop, 'drop')}
        {error ? <p className="warn" role="alert">{error}</p> : null}
        <div className="film-dialog-actions">
          <button type="submit" className="button">{copy.bikeSave}</button>
          <button type="button" className="button ghost" onClick={onClose}>{copy.bikeClose}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
