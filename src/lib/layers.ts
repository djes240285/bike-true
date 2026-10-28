import { band, CORRIDORS, type AngleKey } from './advice';
import type { AngleReading } from './reading';

export type Grade = 'easy' | 'reach' | 'effort' | 'cant';

/** Запас тела. Пустое поле — человек этот тест не отмечал. */
export type BodyLayer = Partial<{
  posterior: Grade;
  hip: Grade;
  ankle: Grade;
  shoulder: Grade;
}>;

export type BikeBits = {
  crankMm: number | null;
  stemMm: number | null;
  saddleMm?: number | null;
  dropMm?: number | null;
};

export type NoteCode =
  | 'knee-crank'
  | 'arm-stem-long'
  | 'arm-stem-short'
  | 'back-posterior'
  | 'hip-flex'
  | 'knee-ankle'
  | 'arm-shoulder'
  | 'back-drop-flat'
  | 'back-drop-up';

const tight = (grade: Grade | undefined) => grade === 'effort' || grade === 'cant';

export function corridorFor(key: AngleKey, body: BodyLayer | null): { min: number; max: number } {
  const base = { ...CORRIDORS[key] };
  if (!body) return base;
  if (key === 'knee' && body.ankle === 'cant') return { ...base, max: 142 };
  if (key === 'knee' && body.ankle === 'effort') return { ...base, max: 146 };
  if (key === 'back' && body.posterior === 'cant') return { ...base, min: 46 };
  if (key === 'back' && body.posterior === 'effort') return { ...base, min: 42 };
  if (key === 'hip' && body.hip === 'cant') return { ...base, min: 64 };
  if (key === 'hip' && body.hip === 'effort') return { ...base, min: 60 };
  if (key === 'arm' && body.shoulder === 'cant') return { ...base, max: 155 };
  if (key === 'arm' && body.shoulder === 'effort') return { ...base, max: 160 };
  return base;
}

export function layerNotes(reading: AngleReading, bike: BikeBits | null, body: BodyLayer | null): NoteCode[] {
  const notes: NoteCode[] = [];
  const base = (key: AngleKey, value: number | null) => {
    if (value === null) return null;
    const corridor = CORRIDORS[key];
    return band(value, corridor.min, corridor.max);
  };
  const shifted = (key: AngleKey, value: number | null) => {
    if (value === null) return null;
    const corridor = corridorFor(key, body);
    return band(value, corridor.min, corridor.max);
  };

  if (base('knee', reading.knee) === 'high' && bike?.crankMm != null && bike.crankMm >= 172.5) notes.push('knee-crank');
  if (base('arm', reading.arm) === 'high' && bike?.stemMm != null && bike.stemMm >= 110) notes.push('arm-stem-long');
  if (base('arm', reading.arm) === 'low' && bike?.stemMm != null && bike.stemMm <= 80) notes.push('arm-stem-short');
  if (tight(body?.posterior) && shifted('back', reading.back) === 'low') notes.push('back-posterior');
  if (tight(body?.ankle) && shifted('knee', reading.knee) === 'high') notes.push('knee-ankle');
  if (tight(body?.hip) && shifted('hip', reading.hip) === 'low') notes.push('hip-flex');
  if (tight(body?.shoulder) && shifted('arm', reading.arm) === 'high') notes.push('arm-shoulder');
  if (base('back', reading.back) === 'low' && bike?.dropMm != null && bike.dropMm >= 90) notes.push('back-drop-flat');
  if (base('back', reading.back) === 'high' && bike?.dropMm != null && bike.dropMm <= 20) notes.push('back-drop-up');
  return notes;
}

const LEADING: Record<AngleKey, NoteCode[]> = {
  knee: ['knee-crank', 'knee-ankle'],
  back: ['back-drop-flat', 'back-drop-up', 'back-posterior'],
  arm: ['arm-stem-long', 'arm-stem-short', 'arm-shoulder'],
  hip: ['hip-flex'],
};

/** Какая фраза заменяет общий совет. Градус при этом не меняется. */
export function leadingNote(
  key: AngleKey,
  reading: AngleReading,
  bike: BikeBits | null,
  body: BodyLayer | null,
): NoteCode | null {
  const notes = layerNotes(reading, bike, body);
  return LEADING[key].find((code) => notes.includes(code)) ?? null;
}

/** Несколько роликов сбоку. Если разошлись — среднее не считаем. */
export function readingsSplit(readings: AngleReading[], limit = 8): AngleKey[] {
  const keys: AngleKey[] = ['knee', 'back', 'arm', 'hip'];
  return keys.filter((key) => {
    const values = readings
      .map((reading) => reading[key])
      .filter((value): value is number => value !== null && Number.isFinite(value))
      .map((value) => Math.round(value));
    if (values.length < 2) return false;
    return Math.max(...values) - Math.min(...values) > limit;
  });
}

/** Фото и ролик расходятся сильнее, чем можно списать на ракурс. */
export function splitAngles(photo: AngleReading, film: AngleReading, limit = 8): AngleKey[] {
  const keys: AngleKey[] = ['knee', 'back', 'arm', 'hip'];
  return keys.filter((key) => {
    const left = photo[key];
    const right = film[key];
    if (left === null || right === null) return false;
    return Math.abs(Math.round(left) - Math.round(right)) > limit;
  });
}
