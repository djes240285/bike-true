import { describe, expect, test } from 'bun:test';
import { angleAt, torsoInclinationDeg, type Point } from './geometry';
import { backStep, idealBottom, idealTop, moved, targetFor, wishBack, type Joints } from './target';

const p = (x: number, y: number): Point => ({ x, y, visibility: 1 });
const length = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Райдер смотрит влево: руль слева, педаль внизу под седлом. Пиксели, y вниз.
const rider: Joints = {
  shoulder: p(300, 300),
  elbow: p(220, 380),
  wrist: p(150, 450),
  hip: p(470, 470),
  knee: p(400, 700),
  ankle: p(480, 950),
};

describe('target', () => {
  test('угол внутри коридора не трогаем, снаружи сдвигаем на 3° к границе', () => {
    expect(targetFor('knee', 146)).toBe(146);
    expect(targetFor('knee', 151)).toBe(150);
    expect(targetFor('knee', 160)).toBe(157);
    expect(targetFor('arm', 174)).toBe(171);
    expect(targetFor('back', 33)).toBe(35);
    expect(targetFor('back', 33, { back: { min: 32, max: 50 } })).toBe(33);
    expect(backStep(45, { min: 42, max: 50 }, 'low')).toEqual({ goal: 42, shown: 42 });
    expect(backStep(45, { min: 42, max: 50 }, 'high')).toEqual({ goal: 50, shown: 48 });
    expect(backStep(42, { min: 42, max: 50 }, 'low')).toBeNull();
    expect(backStep(40, { min: 42, max: 50 }, 'low')).toBeNull();
  });

  test('желание спины двигает только корпус, одним шагом', () => {
    const lower = wishBack(rider, 42);
    const higher = wishBack(rider, 48);
    expect(torsoInclinationDeg(lower.shoulder, lower.hip)).toBeCloseTo(42, 5);
    expect(torsoInclinationDeg(higher.shoulder, higher.hip)).toBeCloseTo(48, 5);
    expect(lower.hip).toEqual(rider.hip);
    expect(lower.knee).toEqual(rider.knee);
    expect(lower.ankle).toEqual(rider.ankle);
    expect(length(lower.shoulder, lower.elbow)).toBeCloseTo(length(rider.shoulder, rider.elbow), 3);
    expect(length(lower.elbow, lower.wrist)).toBeCloseTo(length(rider.elbow, rider.wrist), 3);
    expect(angleAt(lower.shoulder, lower.elbow, lower.wrist)).toBeCloseTo(angleAt(rider.shoulder, rider.elbow, rider.wrist) ?? 0, 3);
  });

  test('нижний кадр: углы уходят к ориентиру, длины звеньев сохраняются', () => {
    const ideal = idealBottom(rider);
    const kneeNow = angleAt(rider.hip, rider.knee, rider.ankle) ?? 0;
    const armNow = angleAt(rider.shoulder, rider.elbow, rider.wrist) ?? 0;
    expect(angleAt(ideal.hip, ideal.knee, ideal.ankle)).toBeCloseTo(targetFor('knee', kneeNow), 0);
    expect(angleAt(ideal.shoulder, ideal.elbow, ideal.wrist)).toBeCloseTo(targetFor('arm', armNow), 0);
    expect(Math.abs(targetFor('knee', kneeNow) - kneeNow)).toBeLessThanOrEqual(3);
    expect(length(ideal.hip, ideal.knee)).toBeCloseTo(length(rider.hip, rider.knee), 3);
    expect(length(ideal.knee, ideal.ankle)).toBeCloseTo(length(rider.knee, rider.ankle), 3);
    expect(length(ideal.shoulder, ideal.hip)).toBeCloseTo(length(rider.shoulder, rider.hip), 3);
    expect(ideal.ankle).toEqual(rider.ankle);
    expect(ideal.knee.x).toBeLessThan(ideal.ankle.x);
  });

  test('спина в коридоре остаётся с тем же наклоном', () => {
    const ideal = idealBottom(rider);
    expect(torsoInclinationDeg(ideal.shoulder, ideal.hip)).toBeCloseTo(
      torsoInclinationDeg(rider.shoulder, rider.hip) ?? 0,
      3,
    );
  });

  test('верхний кадр: бедро и колено на месте, угол бедра к ориентиру', () => {
    const top: Joints = { ...rider, knee: p(330, 480), ankle: p(420, 650) };
    const before = angleAt(top.shoulder, top.hip, top.knee) ?? 0;
    const ideal = idealTop(top);
    expect(ideal.hip).toEqual(top.hip);
    expect(ideal.knee).toEqual(top.knee);
    expect(angleAt(ideal.shoulder, ideal.hip, ideal.knee)).toBeCloseTo(targetFor('hip', before), 0);
  });

  test('если всё в ориентире, силуэт не двигается', () => {
    let pose = rider;
    for (let step = 0; step < 8; step += 1) pose = idealBottom(pose);
    expect(moved(pose, idealBottom(pose))).toBe(false);
  });
});
