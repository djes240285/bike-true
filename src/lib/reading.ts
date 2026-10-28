import { angleAt, meanVisibility, seen, torsoInclinationDeg, type Point } from './geometry';

export type { Point };

export const RIGHT = {
  shoulder: 12,
  elbow: 14,
  wrist: 16,
  hip: 24,
  knee: 26,
  ankle: 28,
} as const;

export const LEFT = {
  shoulder: 11,
  elbow: 13,
  wrist: 15,
  hip: 23,
  knee: 25,
  ankle: 27,
} as const;

export type SideName = 'right' | 'left';

export type Frame = 'bottom' | 'top';

export type AngleReading = {
  knee: number | null;
  back: number | null;
  arm: number | null;
  hip: number | null;
};

const EMPTY: AngleReading = { knee: null, back: null, arm: null, hip: null };

export function pickSide(landmarks: Point[]): SideName | null {
  const right = [RIGHT.shoulder, RIGHT.hip, RIGHT.knee, RIGHT.ankle].map((index) => landmarks[index]).filter(Boolean);
  const left = [LEFT.shoulder, LEFT.hip, LEFT.knee, LEFT.ankle].map((index) => landmarks[index]).filter(Boolean);
  if (right.length < 4 && left.length < 4) return null;
  return meanVisibility(right) >= meanVisibility(left) ? 'right' : 'left';
}

export function crowd(poses: Point[][]): boolean {
  const second = poses[1];
  if (!second) return false;
  const hips = [second[23], second[24]].filter(Boolean);
  return meanVisibility(hips) >= 0.4;
}

export function toPixels(landmarks: Point[], width: number, height: number): Point[] {
  return landmarks.map((point) => ({ ...point, x: point.x * width, y: point.y * height }));
}

export function readFrame(landmarks: Point[], frame: Frame): AngleReading {
  const side = pickSide(landmarks);
  if (!side) return { ...EMPTY };
  const index = side === 'right' ? RIGHT : LEFT;
  const shoulder = landmarks[index.shoulder];
  const elbow = landmarks[index.elbow];
  const wrist = landmarks[index.wrist];
  const hip = landmarks[index.hip];
  const knee = landmarks[index.knee];
  const ankle = landmarks[index.ankle];
  if (!shoulder || !hip || !knee) return { ...EMPTY };

  if (frame === 'top') {
    return {
      ...EMPTY,
      hip: seen([shoulder, hip, knee]) ? angleAt(shoulder, hip, knee) : null,
    };
  }

  return {
    knee: ankle && seen([hip, knee, ankle]) ? angleAt(hip, knee, ankle) : null,
    back: seen([shoulder, hip]) ? torsoInclinationDeg(shoulder, hip) : null,
    arm: elbow && wrist && seen([shoulder, elbow, wrist]) ? angleAt(shoulder, elbow, wrist) : null,
    hip: null,
  };
}
