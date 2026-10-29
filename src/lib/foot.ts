import { angleAt, seen, type Point } from './geometry';

export type AnkleStance = 'line' | 'heel' | 'toe';

/** Угол голень–стопа. Около 90° линия держится, носок вниз — крутит носком, носок вверх — пятка проваливается. */
export function ankleStance(knee: Point, ankle: Point, toe: Point): AnkleStance | null {
  if (!seen([knee, ankle, toe])) return null;
  const angle = angleAt(knee, ankle, toe);
  if (angle === null) return null;
  if (angle < 75) return 'heel';
  if (angle > 105) return 'toe';
  return 'line';
}

/** Сдвиг точки в миллиметрах при известном масштабе. */
export function shiftMm(from: Point, to: Point, millimetersPerPixel: number): number | null {
  if (!Number.isFinite(millimetersPerPixel) || millimetersPerPixel <= 0) return null;
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y) * millimetersPerPixel);
}
export function crankScale(bottomBracket: Point, pedal: Point, crankMm: number): number | null {
  if (!Number.isFinite(crankMm) || crankMm <= 0) return null;
  const pixels = Math.hypot(pedal.x - bottomBracket.x, pedal.y - bottomBracket.y);
  if (pixels < 1) return null;
  return crankMm / pixels;
}
