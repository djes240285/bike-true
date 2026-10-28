import type { AngleReading } from './reading';

export type StrokeSample = {
  t: number;
  knee: number | null;
  hip: number | null;
  back: number | null;
  arm: number | null;
};

export type StrokeReading = {
  knee: number | null;
  hip: number | null;
  back: number | null;
  arm: number | null;
  kneeSpread: number | null;
  hipSpread: number | null;
};

const GAP_SEC = 0.4;

type Tick = { t: number; v: number; back: number | null; arm: number | null };

/** Пики и впадины одного оборота. Соседние ближе 0.4 с сливаются в более крайнюю. */
function extrema(points: Tick[], mode: 'max' | 'min'): Tick[] {
  if (points.length === 0) return [];
  const hits: Tick[] = [];
  const more = (next: Tick, prev: Tick) => (mode === 'max' ? next.v > prev.v : next.v < prev.v);
  for (let i = 1; i < points.length - 1; i += 1) {
    const point = points[i];
    const peak = mode === 'max'
      ? point.v >= points[i - 1].v && point.v > points[i + 1].v
      : point.v <= points[i - 1].v && point.v < points[i + 1].v;
    if (!peak) continue;
    const last = hits[hits.length - 1];
    if (last && point.t - last.t < GAP_SEC) {
      if (more(point, last)) hits[hits.length - 1] = point;
      continue;
    }
    hits.push(point);
  }
  if (hits.length > 0) return hits;
  return [points.reduce((best, point) => (more(point, best) ? point : best))];
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function spread(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(Math.max(...values) - Math.min(...values));
}

export function readStroke(samples: StrokeSample[]): StrokeReading {
  const knees: Tick[] = [];
  const hips: Tick[] = [];
  for (const sample of samples) {
    if (sample.knee !== null) knees.push({ t: sample.t, v: sample.knee, back: sample.back, arm: sample.arm });
    if (sample.hip !== null) hips.push({ t: sample.t, v: sample.hip, back: sample.back, arm: sample.arm });
  }
  const bottoms = extrema(knees, 'max');
  const tops = extrema(hips, 'min');
  const backs = bottoms.map((point) => point.back).filter((value): value is number => value !== null);
  const arms = bottoms.map((point) => point.arm).filter((value): value is number => value !== null);
  const kneeValues = bottoms.map((point) => point.v);
  const hipValues = tops.map((point) => point.v);
  return {
    knee: mean(kneeValues),
    hip: mean(hipValues),
    back: mean(backs),
    arm: mean(arms),
    kneeSpread: spread(kneeValues),
    hipSpread: spread(hipValues),
  };
}

export function strokeAngles(stroke: StrokeReading): AngleReading {
  return { knee: stroke.knee, back: stroke.back, arm: stroke.arm, hip: stroke.hip };
}

export const STROKE_STEP_SEC = 1 / 8;
/** До этой длины кадр берётся 8 раз в секунду. */
export const STROKE_FULL_SEC = 30;
/** Дальше первой минуты не читаем. */
export const STROKE_CAP_SEC = 60;
/** Столько кадров хватает на минуту, если шаг уже реже. */
export const STROKE_BUDGET = 240;

export function sampleSpan(durationSec: number): 'full' | 'minute' | 'capped' {
  if (!Number.isFinite(durationSec) || durationSec <= STROKE_FULL_SEC + 0.3) return 'full';
  if (durationSec <= STROKE_CAP_SEC + 0.3) return 'minute';
  return 'capped';
}

/** Весь ролик до минуты. После 30 с шаг реже, чтобы не разбирать каждый кадр. */
export function sampleTimes(durationSec: number, step = STROKE_STEP_SEC, cap = STROKE_CAP_SEC): number[] {
  if (!Number.isFinite(durationSec) || durationSec < 0.4) return [];
  const limit = Math.min(durationSec, cap);
  const paced = limit <= STROKE_FULL_SEC ? step : Math.max(step, limit / STROKE_BUDGET);
  const times: number[] = [];
  for (let time = 0; time < limit - 0.05; time += paced) times.push(Math.round(time * 1000) / 1000);
  return times;
}
