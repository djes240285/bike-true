import { describe, expect, test } from 'bun:test';
import { chainAngles, clearestKnees, deepestIndex, frontalKnee, kneeTrack, overheadFlags, squatSide, torsoAgainstShin, type ChainAngles } from './overhead';

const point = (x: number, y: number) => ({ x, y, visibility: 1 });

describe('оверхед', () => {
  test('нижняя точка — самый низкий таз', () => {
    expect(deepestIndex([0.2, null, 0.8, 0.4])).toBe(2);
    expect(deepestIndex([null, null])).toBeNull();
  });

  test('спереди колени уже, над или шире щиколоток', () => {
    expect(kneeTrack(point(0.32, 0.5), point(0.3, 0.9), point(0.68, 0.5), point(0.7, 0.9))).toBe('over');
    expect(kneeTrack(point(0.45, 0.5), point(0.3, 0.9), point(0.55, 0.5), point(0.7, 0.9))).toBe('in');
    expect(kneeTrack(point(0.2, 0.5), point(0.35, 0.9), point(0.8, 0.5), point(0.65, 0.9))).toBe('out');
  });

  test('спереди берётся кадр, где колени видны лучше, а не среднее', () => {
    const narrow = {
      leftKnee: point(0.45, 0.5),
      leftAnkle: point(0.3, 0.9),
      rightKnee: point(0.55, 0.5),
      rightAnkle: point(0.7, 0.9),
    };
    const over = {
      leftKnee: { ...point(0.32, 0.5), visibility: 0.9 },
      leftAnkle: { ...point(0.3, 0.9), visibility: 0.9 },
      rightKnee: { ...point(0.68, 0.5), visibility: 0.9 },
      rightAnkle: { ...point(0.7, 0.9), visibility: 0.9 },
    };
    expect(clearestKnees([{ ...narrow, leftKnee: { ...narrow.leftKnee, visibility: 0.5 } }, over])).toBe('over');
  });

  test('обе стороны читаются от голени до кисти и шеи', () => {
    const points = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
    points[8] = point(200, 80);
    points[12] = point(220, 200);
    points[14] = point(340, 260);
    points[16] = point(400, 220);
    points[24] = point(400, 520);
    points[26] = point(470, 900);
    points[28] = point(430, 1200);
    const right = chainAngles(points, 'right');
    expect(right.shin).not.toBeNull();
    expect(right.knee).not.toBeNull();
    expect(right.hip).not.toBeNull();
    expect(right.arm).not.toBeNull();
    expect(right.neck).not.toBeNull();
    const left = chainAngles(points, 'left');
    expect(left.knee).toBeNull();
    expect(left.arm).toBeNull();
    expect(left.neck).toBeNull();
  });

  test('сбоку присед отдаёт колено, бедро, корпус и голень в пикселях', () => {
    expect(squatSide([point(0, 0)])).toBeNull();
    const pixels = [
      ...Array.from({ length: 33 }, () => point(0, 0)),
    ];
    pixels[12] = point(220, 300);
    pixels[24] = point(400, 500);
    pixels[26] = point(480, 900);
    pixels[28] = point(420, 1200);
    const read = squatSide(pixels);
    expect(read?.knee).not.toBeNull();
    expect(read?.hip).not.toBeNull();
    expect(read?.torso).not.toBeNull();
    expect((read?.shin ?? 90)).toBeLessThan(40);
    const tilted = pixels.map((item) => ({ ...item }));
    tilted[28] = point(700, 1200);
    expect(squatSide(tilted)?.shin ?? 0).toBeGreaterThan(read?.shin ?? 0);
  });

  test('спереди угол колена меньше, когда колено уходит в сторону', () => {
    const straight = frontalKnee(point(400, 400), point(420, 800), point(400, 1200));
    const out = frontalKnee(point(400, 400), point(700, 800), point(400, 1200));
    expect(straight).not.toBeNull();
    expect(out).not.toBeNull();
    expect(straight as number).toBeGreaterThan(150);
    expect(out as number).toBeLessThan(straight as number);
  });

  test('сводка приседа не подменяет угол на велосипеде', () => {
    const empty: ChainAngles = { shin: null, knee: null, hip: null, arm: null, neck: null };
    const left: ChainAngles = { shin: 6, knee: 90, hip: 70, arm: 170, neck: 140 };
    const right: ChainAngles = { shin: 20, knee: 88, hip: 72, arm: 140, neck: 155 };
    expect(overheadFlags(left, right, 'in')).toEqual(['knees-in', 'shin-uneven', 'neck-uneven', 'arms-short']);
    expect(overheadFlags({ ...empty, hip: 170, arm: 165 }, { ...empty, hip: 168, arm: 162 }, 'over')).toEqual([
      'knees-over',
      'arms-open',
      'hip-shallow',
    ]);
  });

  test('сбоку корпус впереди голени, если он заметно горизонтальнее', () => {
    expect(torsoAgainstShin(point(0.2, 0.4), point(0.5, 0.45), point(0.48, 0.7), point(0.5, 0.95))).toBe('forward');
    expect(torsoAgainstShin(point(0.5, 0.2), point(0.5, 0.5), point(0.2, 0.7), point(0.55, 0.95))).toBe('upright');
  });
});
