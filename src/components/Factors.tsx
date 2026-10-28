import { dict, type Locale } from '../i18n';
import type { Grade } from '../lib/layers';
import type { Factor } from '../lib/layers';

function fill(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((line, [key, value]) => line.replaceAll(`{${key}}`, value), template);
}

function gradeLabel(copy: typeof dict.ru.analyze, grade: Grade) {
  if (grade === 'easy') return copy.gradeEasy;
  if (grade === 'reach') return copy.gradeReach;
  if (grade === 'effort') return copy.gradeEffort;
  return copy.gradeCant;
}

function labelFor(copy: typeof dict.ru.analyze, code: Factor['code']) {
  if (code === 'crank') return copy.factorCrank;
  if (code === 'stem') return copy.factorStem;
  if (code === 'drop') return copy.factorDrop;
  if (code === 'saddle') return copy.factorSaddle;
  if (code === 'posterior') return copy.bodyPosterior;
  if (code === 'hip') return copy.bodyHip;
  if (code === 'ankle') return copy.bodyAnkle;
  return copy.bodyShoulder;
}

function sentence(copy: typeof dict.ru.analyze, angles: typeof dict.ru.angles, row: Factor) {
  const label = labelFor(copy, row.code);
  const angle = angles[row.angle].label;
  const mm = row.mm === null ? '' : String(row.mm);
  const value = row.value === null ? '' : String(Math.round(row.value));
  if (row.code === 'saddle') {
    return row.state === 'missing' ? copy.factorSaddleMissing : fill(copy.factorSaddleLine, { mm });
  }
  if (row.kind === 'bike') {
    if (row.state === 'missing') return fill(copy.factorMissing, { label });
    if (row.value === null) return fill(copy.factorQuietEmpty, { label, mm });
    const values = { label, mm, angle, value, min: String(row.base.min), max: String(row.base.max) };
    return fill(row.state === 'speaks' ? copy.factorSpeaks : copy.factorQuiet, values);
  }
  if (row.state === 'missing') {
    return fill(copy.factorBodyMissing, { label, angle, min: String(row.base.min), max: String(row.base.max) });
  }
  const grade = row.grade ? gradeLabel(copy, row.grade) : '';
  if (row.state === 'hold') {
    return fill(copy.factorHold, { label, grade, angle, min: String(row.corridor.min), max: String(row.corridor.max) });
  }
  if (row.state === 'speaks' && row.value !== null) {
    return fill(copy.factorBodySpeaks, {
      label,
      grade,
      angle,
      value,
      min: String(row.corridor.min),
      max: String(row.corridor.max),
    });
  }
  return fill(copy.factorShifts, {
    label,
    grade,
    angle,
    min: String(row.corridor.min),
    max: String(row.corridor.max),
    baseMin: String(row.base.min),
    baseMax: String(row.base.max),
  });
}

export default function Factors({
  locale,
  rows,
  scope,
}: {
  locale: Locale;
  rows: Factor[];
  scope: 'all' | 'bike' | 'body';
}) {
  const copy = dict[locale].analyze;
  const angles = dict[locale].angles;
  const shown = rows.filter((row) => scope === 'all' || row.kind === scope);
  if (shown.length === 0) return null;
  const bike = shown.filter((row) => row.kind === 'bike');
  const body = shown.filter((row) => row.kind === 'body');
  return (
    <div className="factors">
      {scope === 'all' ? (
        <>
          <h3>{copy.factorTitle}</h3>
          <p>{copy.factorLead}</p>
        </>
      ) : null}
      {bike.length > 0 ? (
        <>
          {scope === 'all' ? <h4>{copy.factorBike}</h4> : null}
          <ul>
            {bike.map((row) => <li key={row.code}>{sentence(copy, angles, row)}</li>)}
          </ul>
        </>
      ) : null}
      {body.length > 0 ? (
        <>
          {scope === 'all' ? <h4>{copy.factorBody}</h4> : null}
          <ul>
            {body.map((row) => <li key={row.code}>{sentence(copy, angles, row)}</li>)}
          </ul>
        </>
      ) : null}
    </div>
  );
}
