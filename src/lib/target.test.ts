import { describe, expect, test } from 'bun:test';
import { angleAt, torsoInclinationDeg, type Point } from './geometry';
import { idealBottom, idealTop, moved, targetFor, type Joints } from './target';

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
  test('угол внутри коридора не трогаем, снаружи ведём к середине', () => {
    expect(targetFor('knee', 146)).toBe(146);
    expect(targetFor('knee', 160)).toBe(145);
    expect(targetFor('arm', 174)).toBe(157.5);
  });

  test('нижний кадр: углы уходят к ориентиру, длины звеньев сохраняются', () => {
    const ideal = idealBottom(rider);
    expect(angleAt(ideal.hip, ideal.knee, ideal.ankle)).toBeCloseTo(145, 0);
    expect(angleAt(ideal.shoulder, ideal.elbow, ideal.wrist)).toBeCloseTo(157.5, 0);
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
    const ideal = idealBottom(idealBottom(rider));
    expect(moved(idealBottom(rider), ideal)).toBe(false);
  });
});
