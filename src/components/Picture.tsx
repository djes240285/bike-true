import { dict, type Locale } from '../i18n';
import { band, CORRIDORS, type AngleKey } from '../lib/advice';
import type { SavedBike } from '../lib/bike-sync';
import type { FitId } from '../lib/fits';
import type { AnkleStance } from '../lib/foot';
import { corridorFor, explainFactors, leadingNote, splitAngles, angleVoice, type BodyLayer, type NoteCode } from '../lib/layers';
import { backStep, type BackWish } from '../lib/target';
import type { AngleReading } from '../lib/reading';
import Factors from './Factors';
import TextHint from './TextHint';

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
  fit,
  hands,
  holdKnee,
  ankle,
  saddleStep,
  ruler = false,
  spread,
  who = '',
  wish = null,
  onWish,
  marks = 0,
}: {
  locale: Locale;
  photo: AngleReading;
  film: AngleReading | null;
  body: BodyLayer;
  bike: SavedBike | null;
  fit: FitId | null;
  hands: 'hoods' | 'drops' | 'tops' | 'grips' | null;
  holdKnee: boolean;
  ankle: AnkleStance | null;
  saddleStep: number | null;
  ruler?: boolean;
  spread: { knee: number | null; hip: number | null } | null;
  who?: string;
  wish?: BackWish | null;
  onWish?: (next: BackWish | null) => void;
  marks?: number;
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
  const ankleLine = ankle === 'line' ? copy.ankleLine : ankle === 'heel' ? copy.ankleHeel : ankle === 'toe' ? copy.ankleToe : null;
  const crankLine = ruler && saddleStep !== null
    ? saddleStep === 0
      ? copy.crankStill
      : copy.crankStep.replace('{mm}', String(saddleStep))
    : ruler && hasNumber
      ? (bike?.crank_mm == null
        ? copy.crankNeed
        : marks === 1
          ? copy.crankNext
          : copy.crankPoints.replace('{mm}', String(bike.crank_mm)))
      : null;

  return (
    <section className="picture">
      {hasNumber || ankleLine || crankLine ? (
        <div className="picture-result">
          <h2>
            {copy.stackTitle}
            <TextHint label={copy.rulesTitle} title={copy.rulesTitle} notes={[copy.ruleAngle, copy.ruleBike, copy.ruleBody]} />
          </h2>
          {who ? <p>{copy.stackSitter.replace('{who}', who)}</p> : null}
          {bodyOn ? <p>{copy.stackBody}</p> : null}
      {KEYS.map((key) => {
        const photoValue = photo[key];
        const filmValue = film?.[key] ?? null;
        const value = filmValue ?? photoValue;
        if (value === null) return null;
        const split = splits.includes(key);
        const shaky = (key === 'knee' && (spread?.knee ?? 0) > 4) || (key === 'hip' && (spread?.hip ?? 0) > 4);
        const corridor = corridorFor(key, body, fit);
        const zone = band(value, corridor.min, corridor.max);
        const lead = leadingNote(key, { ...source, [key]: value }, bikeBits, body);
        const voice = angleVoice(key, zone, fit, hands, holdKnee);
        const fromBody = corridor.min !== CORRIDORS[key].min
          || corridor.max !== CORRIDORS[key].max
          || lead === 'back-posterior'
          || lead === 'hip-flex'
          || lead === 'knee-ankle'
          || lead === 'arm-shoulder';
        let sentence = voice === 'held'
          ? copy.saddleHeld
          : voice === 'back-easy'
            ? copy.backEasy
            : voice === 'back-race'
              ? copy.backRace
              : voice === 'arm-grips'
                ? copy.armGrips
                : voice === 'back-tops'
                  ? copy.backTops
                  : voice === 'arm-tops'
                    ? copy.armTops
                    : lead
                  ? copy.notes[NOTE_KEY[lead]].replace('{mm}', fill(lead, bike))
                  : advice[key][zone];
        const tune = key === 'back' && zone === 'in' && !split && !shaky;
        let wishLine: string | null = null;
        if (tune) {
          sentence = copy.backEnds
            .replace('{value}', String(Math.round(value)))
            .replaceAll('{min}', String(corridor.min))
            .replaceAll('{max}', String(corridor.max));
          if (wish) {
            const step = backStep(value, corridor, wish);
            if (step) {
              const there = step.shown === step.goal;
              const template = wish === 'low'
                ? (there ? copy.wishLowLine : copy.wishLowStep)
                : (there ? copy.wishHighLine : copy.wishHighStep);
              wishLine = template.replace('{shown}', String(step.shown)).replaceAll('{goal}', String(step.goal));
              if (wish === 'low' && hands === 'tops') wishLine = `${wishLine} ${copy.wishLowTops}`;
            }
          }
        }
        let line = `${filmValue !== null ? copy.stackFilm : copy.stackPhoto} ${Math.round(value)}°`;
        if (photoValue !== null && filmValue !== null) {
          const template = split ? copy.stackSplit : copy.stackAgree;
          line = template
            .replace('{label}', angles[key].label)
            .replace('{a}', String(Math.round(photoValue)))
            .replace('{b}', String(Math.round(filmValue)));
        }
        return (
          <article key={key} className={`picture-row${split ? ' is-split' : ''}${fromBody ? ' is-applied' : ''}`}>
            <strong>{angles[key].label}</strong>
            <span>
              {line}
              {split || shaky ? (key === 'knee' && holdKnee ? <i>{sentence}</i> : null) : <i>{sentence}</i>}
            </span>
            {tune ? (
              <span className="wish-row">
                <button type="button" className={`button ghost${wish === 'low' ? ' is-on' : ''}`} aria-pressed={wish === 'low'} disabled={backStep(value, corridor, 'low') === null} onClick={() => onWish?.(wish === 'low' ? null : 'low')}>{copy.wishLow}</button>
                <button type="button" className={`button ghost${wish === 'high' ? ' is-on' : ''}`} aria-pressed={wish === 'high'} disabled={backStep(value, corridor, 'high') === null} onClick={() => onWish?.(wish === 'high' ? null : 'high')}>{copy.wishHigh}</button>
              </span>
            ) : null}
            {wishLine ? <small className="wish-note">{wishLine}</small> : null}
          </article>
        );
      })}
          {ankleLine ? (
            <article className="picture-row">
              <strong>{copy.footTitle}</strong>
              <span><i>{ankleLine}</i></span>
            </article>
          ) : null}
          {crankLine ? (
            <article className="picture-row">
              <strong>{copy.saddleTitle}</strong>
              <span><i>{crankLine}</i></span>
            </article>
          ) : null}
        </div>
      ) : null}
      <details className="audit">
        <summary>{copy.factorTitle}</summary>
        <div className="picture-context">
          <p>{copy.stackBike}</p>
          {bike ? <p>{copy.stackNamed.replace('{name}', bike.name)}</p> : <p>{copy.stackOpen}</p>}
          {bike?.saddle_mm != null ? <p>{copy.stackSaddle.replace('{mm}', String(bike.saddle_mm))}</p> : null}
          <Factors locale={locale} scope="all" rows={explainFactors(source, bikeBits, body, fit)} />
        </div>
      </details>
    </section>
  );
}
