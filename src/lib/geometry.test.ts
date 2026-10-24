import { describe, expect, test } from 'bun:test';
import { angleAt, seen, torsoInclinationDeg } from './geometry';

const visible = { visibility: 1 };

describe('geometry', () => {
  test('прямой угол в точке b', () => {
    const value = angleAt({ x: 0, y: 1, ...visible }, { x: 0, y: 0, ...visible }, { x: 1, y: 0, ...visible });
    expect(value).toBeCloseTo(90, 5);
  });

  test('совпавшие точки не дают угол', () => {
    expect(angleAt({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });

  test('горизонтальный корпус — 0°, вертикальный — 90°', () => {
    expect(torsoInclinationDeg({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0, 5);
    expect(torsoInclinationDeg({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(90, 5);
  });

  test('точка тусклее 0.5 прячет угол', () => {
    expect(seen([{ x: 0, y: 0, visibility: 0.49 }])).toBe(false);
    expect(seen([{ x: 0, y: 0, visibility: 0.5 }])).toBe(true);
  });
});
