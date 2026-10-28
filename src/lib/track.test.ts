import { describe, expect, test } from 'bun:test';
import type { Point } from './geometry';
import { readFrame, toPixels } from './reading';
import { frameAngles, poseAt, smoothPoses, type PoseFrame } from './track';

function still(noise: number): PoseFrame[] {
  return Array.from({ length: 16 }, (_, index) => ({
    t: index / 8,
    points: [{
      x: 0.5 + (index % 2 === 0 ? noise : -noise),
      y: 0.4 + (index % 2 === 0 ? -noise : noise),
      visibility: 1,
    }],
  }));
}

describe('спокойный кадр', () => {
  test('шум точек на паузе сходится и не прыгает', () => {
    const smooth = smoothPoses(still(0.02));
    const tail = smooth.slice(8);
    for (const frame of tail) {
      const point = frame.points?.[0];
      expect(point).toBeTruthy();
      expect(Math.abs((point as Point).x - 0.5)).toBeLessThan(0.006);
      expect(Math.abs((point as Point).y - 0.4)).toBeLessThan(0.006);
    }
  });

  test('быстрое движение не залипает на старой точке', () => {
    const frames: PoseFrame[] = Array.from({ length: 8 }, (_, index) => ({
      t: index / 8,
      points: [{ x: index < 3 ? 0.2 : 0.2 + (index - 2) * 0.12, y: 0.5, visibility: 1 }],
    }));
    const smooth = smoothPoses(frames);
    const last = smooth[7]?.points?.[0];
    expect(last).toBeTruthy();
    expect((last as Point).x).toBeGreaterThan(0.6);
  });

  test('между кадрами точка едет, а не перескакивает', () => {
    const frames: PoseFrame[] = [
      { t: 0, points: [{ x: 0, y: 0, visibility: 1 }] },
      { t: 0.125, points: [{ x: 1, y: 0, visibility: 1 }] },
    ];
    const mid = poseAt(frames, 0.0625);
    expect(mid?.[0]?.x).toBeCloseTo(0.5, 2);
  });

  test('дырка в точках не сдвигает следующие суставы', () => {
    const left = [
      { x: 0, y: 0, visibility: 1 },
      { x: 9, y: 9, visibility: 1 },
      { x: 2, y: 0, visibility: 1 },
    ];
    const right = [
      { x: 0, y: 0, visibility: 1 },
      undefined as unknown as Point,
      { x: 4, y: 0, visibility: 1 },
    ];
    const mid = poseAt([{ t: 0, points: left }, { t: 0.125, points: right }], 0.0625);
    expect(mid).toHaveLength(3);
    expect(mid?.[2]?.x).toBeCloseTo(3, 2);
  });

  test('вертикальный кадр: градус как в пикселях, не в долях', () => {
    const points: Point[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
    points[12] = { x: 0.2, y: 0.3, visibility: 1 };
    points[14] = { x: 0.35, y: 0.45, visibility: 1 };
    points[16] = { x: 0.5, y: 0.4, visibility: 1 };
    points[24] = { x: 0.4, y: 0.4, visibility: 1 };
    points[26] = { x: 0.55, y: 0.75, visibility: 1 };
    points[28] = { x: 0.5, y: 0.95, visibility: 1 };
    const at = poseAt(smoothPoses([{ t: 0, points }, { t: 0.125, points }]), 0.0625);
    expect(at).toBeTruthy();
    const angles = frameAngles(at as Point[], 1080, 1920);
    const pixels = readFrame(toPixels(points, 1080, 1920), 'bottom');
    expect(angles.back).toBeCloseTo(pixels.back ?? 0, 1);
    expect(Math.abs((angles.back ?? 0) - (readFrame(points, 'bottom').back ?? 0))).toBeGreaterThan(5);
  });
});
