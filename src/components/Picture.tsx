import { dict, type Locale } from '../i18n';
import { band, type AngleKey } from '../lib/advice';
import type { SavedBike } from '../lib/bike-sync';
import { corridorFor, explainFactors, leadingNote, splitAngles, type BodyLayer, type NoteCode } from '../lib/layers';
import type { AngleReading } from '../lib/reading';
import Factors from './Factors';

const KEYS: AngleKey[] = ['knee', 'back', 'arm', 'hip'];

const NOTE_KEY: Record<NoteCode, keyof typeof dict.ru.analyze.notes> = {
  'knee-crank': 'kneeCrank',
  'arm-stem-long': 'armStemLong',
  'arm-stem-short': 'armStemShort',
  'back-posterior': 'backPosterior',
  'hip-flex': 'hipFlex',
  'knee-ankle': 'kneeAnkle',
  'arm-shoulder': 'armShoulder',
  'back-drop-flat': 'backDropFlat',
  'back-drop-up': 'backDropUp',
};

function bits(bike: SavedBike | null) {
  if (!bike) return null;
  return { crankMm: bike.crank_mm, stemMm: bike.stem_mm, saddleMm: bike.saddle_mm, dropMm: bike.drop_mm };
}

function fill(code: NoteCode, bike: SavedBike | null) {
  const mm = !bike ? '—' : code.startsWith('arm') ? bike.stem_mm : code.startsWith('back-drop') ? bike.drop_mm : bike.crank_mm;
  return String(mm ?? '—');
}

export default function Picture({
  locale,
  photo,
  film,
  body,
  bike,
}: {
  locale: Locale;
  photo: AngleReading;
  film: AngleReading | null;
  body: BodyLayer;
  bike: SavedBike | null;
}) {
  const copy = dict[locale].analyze;
  const angles = dict[locale].angles;
  const advice = dict[locale].advice;
  const source = film ?? photo;
  const hasNumber = KEYS.some((key) => (film?.[key] ?? photo[key]) !== null);
  const bodyOn = Object.values(body).some((grade) => grade);
  if (!hasNumber && !bodyOn && !bike) return null;
  const splits = film ? splitAngles(photo, film) : [];
  const bikeBits = bits(bike);

  return (
    <section className="picture">
      <h2>{copy.stackTitle}</h2>
      <p>{copy.stackCamera}</p>
      <p>{copy.stackBike}</p>
      {bike ? <p>{copy.stackNamed.replace('{name}', bike.name)}</p> : <p>{copy.stackOpen}</p>}
      {bike?.saddle_mm != null ? <p>{copy.stackSaddle.replace('{mm}', String(bike.saddle_mm))}</p> : null}
      <Factors locale={locale} scope="all" rows={explainFactors(source, bikeBits, body)} />
      {KEYS.map((key) => {
        const photoValue = photo[key];
        const filmValue = film?.[key] ?? null;
        const value = filmValue ?? photoValue;
        if (value === null) return null;
        const split = splits.includes(key);
        const corridor = corridorFor(key, body);
        const zone = band(value, corridor.min, corridor.max);
        const lead = leadingNote(key, { ...source, [key]: value }, bikeBits, body);
        const sentence = lead
          ? copy.notes[NOTE_KEY[lead]].replace('{mm}', fill(lead, bike))
          : advice[key][zone];
        let line = `${filmValue !== null ? copy.stackFilm : copy.stackPhoto} ${Math.round(value)}°`;
        if (photoValue !== null && filmValue !== null) {
          const template = split ? copy.stackSplit : copy.stackAgree;
          line = template
            .replace('{label}', angles[key].label)
            .replace('{a}', String(Math.round(photoValue)))
            .replace('{b}', String(Math.round(filmValue)));
        }
        return (
          <article key={key} className={`picture-row${split ? ' is-split' : ''}`}>
            <strong>{angles[key].label}</strong>
            <span>
              {line}
              {split ? null : <i>{sentence}</i>}
            </span>
          </article>
        );
      })}
    </section>
  );
}
