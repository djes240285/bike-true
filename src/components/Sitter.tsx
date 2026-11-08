import { type Dispatch, type SetStateAction } from 'react';
import { band, CORRIDORS, type AngleKey } from '../lib/advice';
import { dict, type Locale } from '../i18n';
import type { SitterDraft, SitterSlot } from '../lib/device';
import type { FitId } from '../lib/fits';
import { corridorFor, type BodyLayer, type Grade } from '../lib/layers';
import type { AngleReading } from '../lib/reading';
import TextHint from './TextHint';

const QUESTIONS: (keyof BodyLayer)[] = ['posterior', 'hip', 'ankle', 'shoulder'];
const ANGLE: Record<keyof BodyLayer, AngleKey> = {
  posterior: 'back',
  hip: 'hip',
  ankle: 'knee',
  shoulder: 'arm',
};
const GRADES: Grade[] = ['easy', 'reach', 'effort', 'cant'];

function questionText(copy: typeof dict.ru.analyze, id: keyof BodyLayer): string {
  if (id === 'posterior') return copy.bodyPosterior;
  if (id === 'hip') return copy.bodyHip;
  if (id === 'ankle') return copy.bodyAnkle;
  return copy.bodyShoulder;
}

function gradeText(copy: typeof dict.ru.analyze, id: Grade): string {
  if (id === 'easy') return copy.gradeEasy;
  if (id === 'reach') return copy.gradeReach;
  if (id === 'effort') return copy.gradeEffort;
  return copy.gradeCant;
}

export default function Sitter({
  locale,
  draft,
  reading,
  fit,
  onChange,
}: {
  locale: Locale;
  draft: SitterDraft;
  reading: AngleReading;
  fit: FitId | null;
  onChange: Dispatch<SetStateAction<SitterDraft>>;
}) {
  const copy = dict[locale].analyze;
  const slot = draft.who === 'other' ? draft.other : draft.me;

  function update(patch: (current: SitterDraft) => SitterDraft) {
    onChange(patch);
  }

  function setWho(who: SitterDraft['who']) {
    update((current) => ({ ...current, who }));
  }

  function setSlot(next: SitterSlot) {
    update((current) => (current.who === 'other' ? { ...current, other: next } : { ...current, me: next }));
  }

  function toggle(question: keyof BodyLayer, grade: Grade) {
    update((current) => {
      const key = current.who === 'other' ? 'other' : 'me';
      const picked = current[key];
      return {
        ...current,
        [key]: {
          ...picked,
          body: { ...picked.body, [question]: picked.body[question] === grade ? undefined : grade },
        },
      };
    });
  }

  function applied(question: keyof BodyLayer, grade: Grade): string {
    const angleKey = ANGLE[question];
    const value = reading[angleKey];
    const angle = dict[locale].angles[angleKey].label;
    const next = corridorFor(angleKey, { [question]: grade }, fit);
    const base = CORRIDORS[angleKey];
    const moved = next.min !== base.min || next.max !== base.max;
    if (value === null) return moved ? copy.sitterMoved.replace('{angle}', angle).replace('{min}', String(next.min)).replace('{max}', String(next.max)) : copy.sitterWait;
    const zone = band(value, next.min, next.max);
    const hits = (question === 'posterior' || question === 'hip') ? zone === 'low' : zone === 'high';
    if (moved && hits) {
      return copy.sitterSpeaks.replace('{angle}', angle).replace('{value}', String(Math.round(value)));
    }
    const template = moved ? copy.sitterMoved : copy.sitterIn;
    return template.replace('{angle}', angle).replace('{min}', String(next.min)).replace('{max}', String(next.max));
  }

  return (
    <section className="sitter">
      <p className="ask-line">
        {copy.sitterLead}
        <TextHint label={copy.sitterLead} title={copy.sitterLead} text={copy.sitterOtherNote} />
      </p>
      <div className="ask-row" role="group" aria-label={copy.sitterLead}>
        <button className={`button ghost${draft.who === 'me' ? ' is-on' : ''}`} type="button" aria-pressed={draft.who === 'me'} onClick={() => setWho('me')}>
          {copy.sitterMe}
        </button>
        <button className={`button ghost${draft.who === 'other' ? ' is-on' : ''}`} type="button" aria-pressed={draft.who === 'other'} onClick={() => setWho('other')}>
          {copy.sitterOther}
        </button>
      </div>
      {draft.who === 'other' ? (
        <div className="sitter-fields">
          <label>
            {copy.sitterName}
            <input value={slot.name} maxLength={40} onChange={(event) => setSlot({ ...slot, name: event.target.value })} />
          </label>
          <label>
            {copy.sitterHeight}
            <input inputMode="numeric" value={slot.height} onChange={(event) => setSlot({ ...slot, height: event.target.value.replace(/\D/g, '').slice(0, 3) })} />
          </label>
        </div>
      ) : null}
      <p className="ask-line">
        {copy.bodyTitle}
        <TextHint label={copy.bodyTitle} title={copy.bodyTitle} text={copy.sitterBody} />
      </p>
      {QUESTIONS.map((question) => (
        <div key={question} className="grade-row">
          <span>{questionText(copy, question)}</span>
          <span className="grades">
            {GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                className={`button ghost${slot.body[question] === grade ? ' is-on' : ''}`}
                aria-pressed={slot.body[question] === grade}
                onClick={() => toggle(question, grade)}
              >
                {gradeText(copy, grade)}
              </button>
            ))}
          </span>
          {slot.body[question] ? <small role="status">{applied(question, slot.body[question])}</small> : null}
        </div>
      ))}
    </section>
  );
}
