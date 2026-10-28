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

const BODY_ANGLE = {
  posterior: 'back',
  hip: 'hip',
  ankle: 'knee',
  shoulder: 'arm',
} as const;

export type FactorCode = 'crank' | 'stem' | 'drop' | 'saddle' | 'posterior' | 'hip' | 'ankle' | 'shoulder';
export type FactorState = 'missing' | 'quiet' | 'speaks' | 'hold' | 'shifts';

export type Factor = {
  kind: 'bike' | 'body';
  code: FactorCode;
  state: FactorState;
  mm: number | null;
  grade: Grade | null;
  value: number | null;
  base: { min: number; max: number };
  corridor: { min: number; max: number };
  angle: AngleKey;
};

/** Что реально вошло в фразу. Градус с камеры здесь не меняется. */
export function explainFactors(reading: AngleReading, bike: BikeBits | null, body: BodyLayer | null): Factor[] {
  const zone = (key: AngleKey, value: number | null) => {
    if (value === null) return null;
    const corridor = CORRIDORS[key];
    return band(value, corridor.min, corridor.max);
  };
  const bikeFactor = (
    code: 'crank' | 'stem' | 'drop' | 'saddle',
    angle: AngleKey,
    mm: number | null,
    state: FactorState,
  ): Factor => ({
    kind: 'bike',
    code,
    state,
    mm,
    grade: null,
    value: reading[angle],
    base: { ...CORRIDORS[angle] },
    corridor: { ...CORRIDORS[angle] },
    angle,
  });
  const crank = bike?.crankMm ?? null;
  const stem = bike?.stemMm ?? null;
  const drop = bike?.dropMm ?? null;
  const saddle = bike?.saddleMm ?? null;
  const kneeZone = zone('knee', reading.knee);
  const armZone = zone('arm', reading.arm);
  const backZone = zone('back', reading.back);
  const rows: Factor[] = [
    bikeFactor('crank', 'knee', crank, crank === null ? 'missing' : kneeZone === 'high' && crank >= 172.5 ? 'speaks' : 'quiet'),
    bikeFactor(
      'stem',
      'arm',
      stem,
      stem === null ? 'missing' : (armZone === 'high' && stem >= 110) || (armZone === 'low' && stem <= 80) ? 'speaks' : 'quiet',
    ),
    bikeFactor(
      'drop',
      'back',
      drop,
      drop === null ? 'missing' : (backZone === 'low' && drop >= 90) || (backZone === 'high' && drop <= 20) ? 'speaks' : 'quiet',
    ),
    bikeFactor('saddle', 'knee', saddle, saddle === null ? 'missing' : 'quiet'),
  ];
  (['posterior', 'hip', 'ankle', 'shoulder'] as const).forEach((code) => {
    const angle = BODY_ANGLE[code];
    const grade = body?.[code] ?? null;
    const corridor = corridorFor(angle, body);
    const value = reading[angle];
    let state: FactorState = 'missing';
    if (grade === 'easy' || grade === 'reach') state = 'hold';
    else if (grade === 'effort' || grade === 'cant') {
      const shifted = value === null ? null : band(value, corridor.min, corridor.max);
      const hits = code === 'posterior' || code === 'hip' ? shifted === 'low' : shifted === 'high';
      state = hits ? 'speaks' : 'shifts';
    }
    rows.push({
      kind: 'body',
      code,
      state,
      mm: null,
      grade,
      value,
      base: { ...CORRIDORS[angle] },
      corridor,
      angle,
    });
  });
  return rows;
}

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
