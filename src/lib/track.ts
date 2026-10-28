import type { Point } from './geometry';
import { readFrame, toPixels, type AngleReading } from './reading';

export type PoseFrame = {
  t: number;
  points: Point[] | null;
};

const MIN_CUTOFF = 0.5;
const BETA = 1.4;
const DERIVATIVE_CUTOFF = 1;

function gain(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/** Фильтр 1€: на паузе режет дрожь точек, на движении успевает за ногой. */
function smoothChannel(values: Array<number | null>, times: number[]): Array<number | null> {
  let prev: number | null = null;
  let prevTime = 0;
  let speed = 0;
  const out: Array<number | null> = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const time = times[index] ?? 0;
    if (value === null || !Number.isFinite(value)) {
      out.push(prev);
      continue;
    }
    if (prev === null) {
      prev = value;
      prevTime = time;
      speed = 0;
      out.push(value);
      continue;
    }
    const dt = Math.max(1 / 60, time - prevTime);
    const rawSpeed = (value - prev) / dt;
    const speedGain = gain(DERIVATIVE_CUTOFF, dt);
    speed = speedGain * rawSpeed + (1 - speedGain) * speed;
    const cutoff = MIN_CUTOFF + BETA * Math.abs(speed);
    const next = gain(cutoff, dt) * value + (1 - gain(cutoff, dt)) * prev;
    prev = next;
    prevTime = time;
    out.push(next);
  }
  return out;
}

export function smoothPoses(frames: PoseFrame[]): PoseFrame[] {
  const count = frames.reduce((max, frame) => Math.max(max, frame.points?.length ?? 0), 0);
  const times = frames.map((frame) => frame.t);
  const channels: Array<Array<number | null>> = [];
  for (let index = 0; index < count; index += 1) {
    for (const key of ['x', 'y', 'visibility'] as const) {
      channels.push(smoothChannel(frames.map((frame) => {
        const point = frame.points?.[index];
        const value = point?.[key];
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
      }), times));
    }
  }
  return frames.map((frame, at) => {
    if (!frame.points || count === 0) return { t: frame.t, points: frame.points ? frame.points.map((point) => ({ ...point })) : null };
    const points: Point[] = [];
    for (let index = 0; index < count; index += 1) {
      const x = channels[index * 3]?.[at];
      const y = channels[index * 3 + 1]?.[at];
      const visibility = channels[index * 3 + 2]?.[at];
      const raw = frame.points[index];
      if (typeof x !== 'number' || typeof y !== 'number') {
        points.push(raw ? { ...raw } : { x: 0, y: 0, visibility: 0 });
        continue;
      }
      points.push({ x, y, visibility: typeof visibility === 'number' ? visibility : raw?.visibility });
    }
    return { t: frame.t, points };
  });
}

function mix(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

/** Точка между соседними кадрами. Скачка к ближайшему сэмплу нет. */
export function poseAt(frames: PoseFrame[], time: number): Point[] | null {
  let prev: PoseFrame | null = null;
  let next: PoseFrame | null = null;
  for (const frame of frames) {
    if (!frame.points) continue;
    if (frame.t <= time) prev = frame;
    else if (!next) next = frame;
  }
  if (prev?.points && next?.points) {
    const span = next.t - prev.t;
    if (span > 0 && span <= 0.35) {
      const amount = (time - prev.t) / span;
      const count = Math.min(prev.points.length, next.points.length);
      const points: Point[] = [];
      for (let index = 0; index < count; index += 1) {
        const start = prev.points[index];
        const end = next.points[index];
        if (!start || !end) {
          points.push(start ?? end ?? { x: 0, y: 0, visibility: 0 });
          continue;
        }
        points.push({
          x: mix(start.x, end.x, amount),
          y: mix(start.y, end.y, amount),
          visibility: mix(start.visibility ?? 0, end.visibility ?? 0, amount),
        });
      }
      return points;
    }
  }
  const near = prev && (!next || time - prev.t <= next.t - time) ? prev : next;
  if (!near?.points || Math.abs(near.t - time) > 0.2) return null;
  return near.points;
}

/** Градус только в пикселях: на вертикальном ролике доли кадра врут. */
export function frameAngles(points: Point[], width: number, height: number): AngleReading {
  const pixels = toPixels(points, width, height);
  const down = readFrame(pixels, 'bottom');
  const up = readFrame(pixels, 'top');
  return { knee: down.knee, back: down.back, arm: down.arm, hip: up.hip };
}
