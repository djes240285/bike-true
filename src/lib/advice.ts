export type Band = 'low' | 'in' | 'high';

export type AngleKey = 'knee' | 'back' | 'arm' | 'hip';

export const CORRIDORS: Record<AngleKey, { min: number; max: number }> = {
  knee: { min: 140, max: 150 },
  hip: { min: 55, max: 70 },
  back: { min: 35, max: 50 },
  arm: { min: 150, max: 165 },
};

export function band(value: number, min: number, max: number): Band {
  if (value < min) return 'low';
  if (value > max) return 'high';
  return 'in';
}

export function bandFor(key: AngleKey, value: number): Band {
  const corridor = CORRIDORS[key];
  return band(value, corridor.min, corridor.max);
}
