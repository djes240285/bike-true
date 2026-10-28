import { safeNext } from './gate';
import { isFit, isRider, type FitId, type RiderId } from './fits';
import { hasPhotoField } from './visit';

export const BIKE_LIMIT = 20;
export const READING_LIMIT = 100;

export function overLimit(count: number, limit: number): boolean {
  return count >= limit;
}

export function cabinetNext(raw: string | null | undefined): string {
  const next = safeNext(raw);
  return next === '/' ? '/account' : next;
}

export function parseDisplayName(value: unknown): { ok: true; name: string } | { ok: false; error: 'name' } {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 80) return { ok: false, error: 'name' };
  return { ok: true, name };
}

function emptyInt(value: unknown): unknown {
  return value === '' ? null : value;
}

function optionalInt(value: unknown, min: number, max: number): number | null | undefined {
  const raw = emptyInt(value);
  if (raw === null) return null;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= min && raw <= max) return raw;
  return undefined;
}

export const BIKE_MM = {
  crank_mm: { min: 120, max: 180 },
  saddle_mm: { min: 400, max: 1000 },
  stem_mm: { min: 30, max: 150 },
  drop_mm: { min: -150, max: 200 },
} as const;

export type BikeMmKey = keyof typeof BIKE_MM;

/** Пусто — null. Целое или половина миллиметра (172,5) — ближайшее целое. Иначе ошибка. */
export function parseMmInput(raw: string): number | null | undefined {
  const text = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!text) return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return undefined;
  const value = Number(text);
  if (!Number.isFinite(value)) return undefined;
  const halves = value * 2;
  if (Math.abs(halves - Math.round(halves)) > 1e-6) return undefined;
  return Math.round(value);
}

export function mmFits(key: BikeMmKey, value: number | null): boolean {
  if (value === null) return true;
  const range = BIKE_MM[key];
  return value >= range.min && value <= range.max;
}

/** Если число похоже на сантиметры и ×10 входит в диапазон — вернуть миллиметры. */
export function cmSuggestion(key: BikeMmKey, raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  const scaled = Math.round(value * 10);
  return mmFits(key, scaled) && !mmFits(key, Math.round(value)) ? scaled : null;
}

export function parseProfile(body: unknown) {
  if (hasPhotoField(body)) return { ok: false as const, error: 'photo' as const };
  if (!body || typeof body !== 'object') return { ok: false as const, error: 'rider' as const };
  const record = body as Record<string, unknown>;
  if (record.rider !== null && !isRider(record.rider)) return { ok: false as const, error: 'rider' as const };
  const heightCm = optionalInt(record.height_cm, 90, 220);
  if (heightCm === undefined) return { ok: false as const, error: 'height' as const };
  const inseamCm = optionalInt(record.inseam_cm, 40, 110);
  if (inseamCm === undefined) return { ok: false as const, error: 'inseam' as const };
  if (heightCm !== null && inseamCm !== null && inseamCm >= heightCm) return { ok: false as const, error: 'inseam' as const };
  return { ok: true as const, profile: { rider: record.rider as RiderId | null, heightCm, inseamCm } };
}

const PERSON_GRADES = ['easy', 'reach', 'effort', 'cant'] as const;
const PERSON_FLAGS = ['knees-in', 'knees-over', 'knees-out', 'shin-uneven', 'neck-uneven', 'arms-open', 'arms-short', 'hip-shallow'] as const;
const CHAIN_KEYS = ['shin', 'knee', 'hip', 'arm', 'neck'] as const;

export type PersonChain = Record<(typeof CHAIN_KEYS)[number], number | null>;
export type PersonOverhead = {
  left: PersonChain;
  right: PersonChain;
  flags: Array<(typeof PERSON_FLAGS)[number]>;
};

function personGrade(value: unknown): (typeof PERSON_GRADES)[number] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  return PERSON_GRADES.includes(value as (typeof PERSON_GRADES)[number]) ? value as (typeof PERSON_GRADES)[number] : undefined;
}

function personChain(value: unknown): PersonChain | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const chain = {} as PersonChain;
  for (const key of CHAIN_KEYS) {
    const item = record[key];
    if (item === null || item === undefined) {
      chain[key] = null;
      continue;
    }
    if (typeof item !== 'number' || !Number.isInteger(item) || item < 0 || item > 180) return undefined;
    chain[key] = item;
  }
  return chain;
}

/** Карточка человека. Поле, которого нет в запросе, не трогаем. */
export function parsePerson(body: unknown) {
  if (hasPhotoField(body)) return { ok: false as const, error: 'photo' as const };
  if (!body || typeof body !== 'object') return { ok: false as const, error: 'body' as const };
  const record = body as Record<string, unknown>;
  const posterior = personGrade(record.posterior);
  const hip = personGrade(record.hip);
  const ankle = personGrade(record.ankle);
  const shoulder = personGrade(record.shoulder);
  if (posterior === undefined && 'posterior' in record) return { ok: false as const, error: 'body' as const };
  if (hip === undefined && 'hip' in record) return { ok: false as const, error: 'body' as const };
  if (ankle === undefined && 'ankle' in record) return { ok: false as const, error: 'body' as const };
  if (shoulder === undefined && 'shoulder' in record) return { ok: false as const, error: 'body' as const };
  let overhead: PersonOverhead | null | undefined;
  if (!('overhead' in record)) overhead = undefined;
  else if (record.overhead === null) overhead = null;
  else {
    const raw = record.overhead;
    if (!raw || typeof raw !== 'object') return { ok: false as const, error: 'overhead' as const };
    const card = raw as Record<string, unknown>;
    const left = personChain(card.left);
    const right = personChain(card.right);
    const flags = Array.isArray(card.flags) ? card.flags : undefined;
    if (!left || !right || !flags || flags.some((flag) => typeof flag !== 'string' || !PERSON_FLAGS.includes(flag as (typeof PERSON_FLAGS)[number]))) {
      return { ok: false as const, error: 'overhead' as const };
    }
    overhead = { left, right, flags: flags as PersonOverhead['flags'] };
  }
  const person = { posterior, hip, ankle, shoulder, overhead };
  if (posterior === undefined && hip === undefined && ankle === undefined && shoulder === undefined && overhead === undefined) {
    return { ok: false as const, error: 'body' as const };
  }
  return { ok: true as const, person };
}

export function parseBike(body: unknown) {
  if (hasPhotoField(body)) return { ok: false as const, error: 'photo' as const };
  if (!body || typeof body !== 'object') return { ok: false as const, error: 'name' as const };
  const record = body as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name || name.length > 40) return { ok: false as const, error: 'name' as const };
  if (!isFit(record.fit)) return { ok: false as const, error: 'fit' as const };
  const crankMm = optionalInt(record.crank_mm, BIKE_MM.crank_mm.min, BIKE_MM.crank_mm.max);
  const saddleMm = optionalInt(record.saddle_mm, BIKE_MM.saddle_mm.min, BIKE_MM.saddle_mm.max);
  const stemMm = optionalInt(record.stem_mm, BIKE_MM.stem_mm.min, BIKE_MM.stem_mm.max);
  const dropMm = optionalInt(record.drop_mm, BIKE_MM.drop_mm.min, BIKE_MM.drop_mm.max);
  if (crankMm === undefined || saddleMm === undefined || stemMm === undefined || dropMm === undefined) {
    return { ok: false as const, error: 'bike' as const };
  }
  return { ok: true as const, bike: { name, fit: record.fit as FitId, crankMm, saddleMm, stemMm, dropMm } };
}

export function parseReading(body: unknown) {
  if (hasPhotoField(body)) return { ok: false as const, error: 'photo' as const };
  if (!body || typeof body !== 'object') return { ok: false as const, error: 'fit' as const };
  const record = body as Record<string, unknown>;
  if (!isFit(record.fit)) return { ok: false as const, error: 'fit' as const };
  const bikeRaw = emptyInt(record.bike_id);
  let bikeId: number | null = null;
  if (bikeRaw !== null && bikeRaw !== undefined) {
    if (typeof bikeRaw !== 'number' || !Number.isInteger(bikeRaw) || bikeRaw < 1) return { ok: false as const, error: 'bike' as const };
    bikeId = bikeRaw;
  }
  const angles = ['knee', 'back', 'arm', 'hip'] as const;
  const reading = { fit: record.fit as FitId, bikeId, knee: null as number | null, back: null as number | null, arm: null as number | null, hip: null as number | null, hadTop: record.had_top === true };
  for (const key of angles) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false as const, error: 'angles' as const };
    reading[key] = value;
  }
  if (reading.knee === null && reading.back === null && reading.arm === null && reading.hip === null) {
    return { ok: false as const, error: 'angles' as const };
  }
  return { ok: true as const, reading };
}
