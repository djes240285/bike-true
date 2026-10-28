import { angleAt, seen, torsoInclinationDeg, type Point } from './geometry';
import { LEFT, pickSide, RIGHT } from './reading';

/** Нижняя точка приседа: больший y — ниже в кадре. */
export function deepestIndex(hipYs: Array<number | null>): number | null {
  let best = -1;
  let lowest = -Infinity;
  hipYs.forEach((value, index) => {
    if (value === null || !Number.isFinite(value) || value <= lowest) return;
    lowest = value;
    best = index;
  });
  return best < 0 ? null : best;
}

export type KneeTrack = 'in' | 'over' | 'out';

/** Спереди: колени уже, над или шире щиколоток. Носки не меряем. */
export function kneeTrack(
  leftKnee: Point,
  leftAnkle: Point,
  rightKnee: Point,
  rightAnkle: Point,
): KneeTrack | null {
  if (!seen([leftKnee, leftAnkle, rightKnee, rightAnkle])) return null;
  const ankles = Math.abs(leftAnkle.x - rightAnkle.x);
  const knees = Math.abs(leftKnee.x - rightKnee.x);
  if (ankles < 1e-4) return null;
  const ratio = knees / ankles;
  if (ratio < 0.85) return 'in';
  if (ratio > 1.15) return 'out';
  return 'over';
}

/** Спереди: кадр, где оба колена и щиколотки видны лучше всего. Среднее по ролику не берём. */
export function clearestKnees(
  frames: Array<{
    leftKnee: Point;
    leftAnkle: Point;
    rightKnee: Point;
    rightAnkle: Point;
  } | null>,
): KneeTrack | null {
  let bestScore = -1;
  let best: KneeTrack | null = null;
  for (const frame of frames) {
    if (!frame) continue;
    const points = [frame.leftKnee, frame.leftAnkle, frame.rightKnee, frame.rightAnkle];
    if (!seen(points)) continue;
    const track = kneeTrack(frame.leftKnee, frame.leftAnkle, frame.rightKnee, frame.rightAnkle);
    if (!track) continue;
    const score = points.reduce((sum, point) => sum + (point.visibility ?? 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = track;
    }
  }
  return best;
}

export type ChainAngles = {
  shin: number | null;
  knee: number | null;
  hip: number | null;
  arm: number | null;
  neck: number | null;
};

const EAR = { left: 7, right: 8 } as const;

/** Одна сторона в пикселях: голень, колено, бедро, рука, шея. Пустое поле — сустав не виден. */
export function chainAngles(landmarks: Point[], side: 'left' | 'right'): ChainAngles {
  const index = side === 'right' ? RIGHT : LEFT;
  const ear = landmarks[EAR[side]];
  const shoulder = landmarks[index.shoulder];
  const elbow = landmarks[index.elbow];
  const wrist = landmarks[index.wrist];
  const hip = landmarks[index.hip];
  const knee = landmarks[index.knee];
  const ankle = landmarks[index.ankle];
  const shinTilt = knee && ankle && seen([knee, ankle]) ? torsoInclinationDeg(knee, ankle) : null;
  return {
    shin: shinTilt === null ? null : 90 - shinTilt,
    knee: hip && knee && ankle && seen([hip, knee, ankle]) ? angleAt(hip, knee, ankle) : null,
    hip: shoulder && hip && knee && seen([shoulder, hip, knee]) ? angleAt(shoulder, hip, knee) : null,
    arm: shoulder && elbow && wrist && seen([shoulder, elbow, wrist]) ? angleAt(shoulder, elbow, wrist) : null,
    neck: ear && shoulder && hip && seen([ear, shoulder, hip]) ? angleAt(ear, shoulder, hip) : null,
  };
}

export type SquatSide = {
  knee: number | null;
  hip: number | null;
  torso: number | null;
  shin: number | null;
};

/** Сбоку, в пикселях: сгиб колена, сгиб бедра, наклон корпуса, голень от вертикали. */
export function squatSide(landmarks: Point[]): SquatSide | null {
  const side = pickSide(landmarks);
  if (!side) return null;
  const index = side === 'right' ? RIGHT : LEFT;
  const shoulder = landmarks[index.shoulder];
  const hip = landmarks[index.hip];
  const knee = landmarks[index.knee];
  const ankle = landmarks[index.ankle];
  if (!shoulder || !hip || !knee || !ankle) return null;
  const shinTilt = torsoInclinationDeg(knee, ankle);
  return {
    knee: seen([hip, knee, ankle]) ? angleAt(hip, knee, ankle) : null,
    hip: seen([shoulder, hip, knee]) ? angleAt(shoulder, hip, knee) : null,
    torso: seen([shoulder, hip]) ? torsoInclinationDeg(shoulder, hip) : null,
    shin: shinTilt === null ? null : 90 - shinTilt,
  };
}

/** Спереди: угол бедро–колено–щиколотка в плоскости кадра. */
export function frontalKnee(hip: Point, knee: Point, ankle: Point): number | null {
  if (!seen([hip, knee, ankle])) return null;
  return angleAt(hip, knee, ankle);
}

export type TorsoCue = 'forward' | 'with' | 'upright';

/** Сбоку: корпус горизонтальнее голени, рядом с ней или вертикальнее. */
export function torsoAgainstShin(shoulder: Point, hip: Point, knee: Point, ankle: Point): TorsoCue | null {
  if (!seen([shoulder, hip, knee, ankle])) return null;
  const torso = torsoInclinationDeg(shoulder, hip);
  const shin = torsoInclinationDeg(knee, ankle);
  if (torso === null || shin === null) return null;
  const gap = shin - torso;
  if (gap > 12) return 'forward';
  if (gap < -12) return 'upright';
  return 'with';
}
