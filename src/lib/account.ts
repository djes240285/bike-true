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
