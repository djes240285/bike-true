import { describe, expect, test } from 'bun:test';
import { bandFor } from './advice';
import { crowd, readFrame, toPixels, type Point } from './reading';

function pose(overrides: Record<number, Partial<Point>> = {}): Point[] {
  const points: Point[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  const visible = { visibility: 1 };
  const right = {
    12: { x: 0.2, y: 0.3, ...visible },
    14: { x: 0.35, y: 0.45, ...visible },
    16: { x: 0.5, y: 0.4, ...visible },
    24: { x: 0.4, y: 0.55, ...visible },
    26: { x: 0.55, y: 0.75, ...visible },
    28: { x: 0.5, y: 0.95, ...visible },
  };
  for (const [index, point] of Object.entries({ ...right, ...overrides })) {
    points[Number(index)] = { x: 0, y: 0, visibility: 1, ...point };
  }
  return points;
}

describe('advice bands', () => {
  test('колено ниже, внутри и выше коридора', () => {
    expect(bandFor('knee', 130)).toBe('low');
    expect(bandFor('knee', 145)).toBe('in');
    expect(bandFor('knee', 160)).toBe('high');
  });

  test('спина, рука и бедро тоже делятся на три полосы', () => {
    expect(bandFor('back', 20)).toBe('low');
    expect(bandFor('back', 42)).toBe('in');
    expect(bandFor('back', 70)).toBe('high');
    expect(bandFor('arm', 140)).toBe('low');
    expect(bandFor('arm', 170)).toBe('high');
    expect(bandFor('hip', 40)).toBe('low');
    expect(bandFor('hip', 60)).toBe('in');
    expect(bandFor('hip', 90)).toBe('high');
  });
});

describe('reading', () => {
  test('нижний кадр не выдумывает бедро', () => {
    const reading = readFrame(pose(), 'bottom');
    expect(reading.hip).toBeNull();
    expect(reading.knee).not.toBeNull();
    expect(reading.back).not.toBeNull();
    expect(reading.arm).not.toBeNull();
  });

  test('верхний кадр отдаёт только бедро', () => {
    const reading = readFrame(pose(), 'top');
    expect(reading.hip).not.toBeNull();
    expect(reading.knee).toBeNull();
    expect(reading.back).toBeNull();
    expect(reading.arm).toBeNull();
  });

  test('тусклое колено прячет угол колена', () => {
    const reading = readFrame(pose({ 26: { x: 0.5, y: 0.7, visibility: 0.2 } }), 'bottom');
    expect(reading.knee).toBeNull();
  });

  test('вертикальный кадр: угол считается в пикселях, а не в долях', () => {
    const shoulder = { x: 0.2, y: 0.3, visibility: 1 };
    const hip = { x: 0.4, y: 0.4, visibility: 1 };
    const points = pose({ 12: shoulder, 24: hip });
    const square = readFrame(points, 'bottom').back ?? 0;
    const portrait = readFrame(toPixels(points, 1080, 1920), 'bottom').back ?? 0;
    expect(square).toBeCloseTo(26.57, 1);
    expect(portrait).toBeCloseTo(41.63, 1);
  });

  test('второй человек в кадре', () => {
    const ghost = pose();
    ghost[23] = { x: 0.1, y: 0.5, visibility: 0.8 };
    ghost[24] = { x: 0.2, y: 0.5, visibility: 0.8 };
    expect(crowd([pose(), ghost])).toBe(true);
    expect(crowd([pose()])).toBe(false);
  });
});
