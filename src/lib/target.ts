import { CORRIDORS, bandFor, type AngleKey } from './advice';
import { angleAt, torsoInclinationDeg, type Point } from './geometry';
import { LEFT, RIGHT, pickSide } from './reading';

export type JointName = 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'knee' | 'ankle';
export type Joints = Record<JointName, Point>;

export const JOINT_NAMES: JointName[] = ['wrist', 'elbow', 'shoulder', 'hip', 'knee', 'ankle'];

export function jointsOf(landmarks: Point[]): Joints | null {
  const side = pickSide(landmarks);
  if (!side) return null;
  const index = side === 'right' ? RIGHT : LEFT;
  const joints = {} as Joints;
  for (const name of JOINT_NAMES) {
    const point = landmarks[index[name]];
    if (!point) return null;
    joints[name] = { x: point.x, y: point.y, visibility: point.visibility };
  }
  return joints;
}

/** Угол внутри коридора не трогаем, вышедший за коридор ведём к его середине. */
export function targetFor(key: AngleKey, value: number): number {
  if (bandFor(key, value) === 'in') return value;
  const { min, max } = CORRIDORS[key];
  return (min + max) / 2;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (from: Point, to: Point) => {
  const length = distance(from, to) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
};
const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Средний сустав между двумя концами при заданных длинах, на той же стороне, что и раньше. */
function middleJoint(start: Point, end: Point, first: number, second: number, sideRef: number): Point {
  const span = Math.min(distance(start, end), first + second - 1e-6);
  const along = (first * first - second * second + span * span) / (2 * span);
  const height = Math.sqrt(Math.max(0, first * first - along * along));
  const direction = unit(start, end);
  const base = { x: start.x + direction.x * along, y: start.y + direction.y * along };
  const normal = { x: -direction.y, y: direction.x };
  const a = { x: base.x + normal.x * height, y: base.y + normal.y * height };
  const b = { x: base.x - normal.x * height, y: base.y - normal.y * height };
  return Math.sign(cross(start, end, a)) === Math.sign(sideRef) ? a : b;
}

/** Расстояние между концами двух звеньев при заданном угле между ними. */
function spanFor(first: number, second: number, angle: number) {
  return Math.sqrt(first * first + second * second - 2 * first * second * Math.cos(radians(angle)));
}

function keep(point: Point, from: Point): Point {
  return { ...from, x: point.x, y: point.y };
}

/**
 * Нижний кадр: стопа на педали остаётся на месте.
 * Колено меняет расстояние до бедра (это высота седла), корпус наклоняется к ориентиру,
 * рука сгибается к ориентиру, а кисть показывает, куда уехал бы руль.
 */
export function idealBottom(current: Joints): Joints {
  const next: Joints = { ...current };
  const { shoulder, elbow, wrist, hip, knee, ankle } = current;

  const kneeNow = angleAt(hip, knee, ankle);
  if (kneeNow !== null) {
    const thigh = distance(hip, knee);
    const shin = distance(knee, ankle);
    const span = spanFor(thigh, shin, targetFor('knee', kneeNow));
    const direction = unit(ankle, hip);
    next.hip = keep({ x: ankle.x + direction.x * span, y: ankle.y + direction.y * span }, hip);
    next.knee = keep(middleJoint(next.hip, ankle, thigh, shin, cross(hip, ankle, knee)), knee);
  }

  const shift = { x: next.hip.x - hip.x, y: next.hip.y - hip.y };
  next.shoulder = keep({ x: shoulder.x + shift.x, y: shoulder.y + shift.y }, shoulder);

  const backNow = torsoInclinationDeg(shoulder, hip);
  if (backNow !== null) {
    const torso = distance(shoulder, hip);
    const target = radians(targetFor('back', backNow));
    const forward = Math.sign(shoulder.x - hip.x) || 1;
    const up = Math.sign(shoulder.y - hip.y) || -1;
    next.shoulder = keep(
      { x: next.hip.x + forward * torso * Math.cos(target), y: next.hip.y + up * torso * Math.sin(target) },
      shoulder,
    );
  }

  const armNow = angleAt(shoulder, elbow, wrist);
  const upper = distance(shoulder, elbow);
  const fore = distance(elbow, wrist);
  const reach = armNow === null ? distance(shoulder, wrist) : spanFor(upper, fore, targetFor('arm', armNow));
  const towardBar = unit(shoulder, wrist);
  next.wrist = keep(
    { x: next.shoulder.x + towardBar.x * reach, y: next.shoulder.y + towardBar.y * reach },
    wrist,
  );
  next.elbow = keep(middleJoint(next.shoulder, next.wrist, upper, fore, cross(shoulder, wrist, elbow)), elbow);

  return next;
}

/** Верхний кадр: бедро и колено на месте, корпус раскрывается или закрывается к ориентиру. */
export function idealTop(current: Joints): Joints {
  const next: Joints = { ...current };
  const { shoulder, elbow, wrist, hip, knee } = current;
  const hipNow = angleAt(shoulder, hip, knee);
  if (hipNow === null) return next;

  const torso = distance(shoulder, hip);
  const towardKnee = unit(hip, knee);
  const turn = Math.sign(cross(hip, knee, shoulder)) || 1;
  const target = radians(targetFor('hip', hipNow)) * turn;
  const cos = Math.cos(target);
  const sin = Math.sin(target);
  const direction = { x: towardKnee.x * cos - towardKnee.y * sin, y: towardKnee.x * sin + towardKnee.y * cos };
  next.shoulder = keep({ x: hip.x + direction.x * torso, y: hip.y + direction.y * torso }, shoulder);

  const shift = { x: next.shoulder.x - shoulder.x, y: next.shoulder.y - shoulder.y };
  next.elbow = keep({ x: elbow.x + shift.x, y: elbow.y + shift.y }, elbow);
  next.wrist = keep({ x: wrist.x + shift.x, y: wrist.y + shift.y }, wrist);
  return next;
}

export function lerpJoints(from: Joints, to: Joints, t: number): Joints {
  const out = {} as Joints;
  for (const name of JOINT_NAMES) {
    out[name] = {
      ...from[name],
      x: from[name].x + (to[name].x - from[name].x) * t,
      y: from[name].y + (to[name].y - from[name].y) * t,
    };
  }
  return out;
}

export function moved(from: Joints, to: Joints, tolerance = 1): boolean {
  return JOINT_NAMES.some((name) => distance(from[name], to[name]) > tolerance);
}
