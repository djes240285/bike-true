import { describe, expect, test } from 'bun:test';
import { ankleStance, crankScale, shiftMm } from './foot';
import type { Point } from './geometry';

const p = (x: number, y: number): Point => ({ x, y, visibility: 1 });

describe('стопа', () => {
  test('прямой угол голени и стопы — линия держится', () => {
    expect(ankleStance(p(0, -10), p(0, 0), p(10, 0))).toBe('line');
  });

  test('носок сильно вниз — крутит носком', () => {
    expect(ankleStance(p(0, -10), p(0, 0), p(10, 8))).toBe('toe');
  });

  test('носок вверх — пятка проваливается', () => {
    expect(ankleStance(p(0, -10), p(0, 0), p(10, -8))).toBe('heel');
  });

  test('тусклая стопа не даёт состояния', () => {
    expect(ankleStance(p(0, -10), p(0, 0), { x: 10, y: 0, visibility: 0.2 })).toBeNull();
  });
});

describe('линейка шатуна', () => {
  test('100 пикселей и 170 мм дают 1.7 мм на пиксель', () => {
    expect(crankScale(p(0, 0), p(100, 0), 170)).toBeCloseTo(1.7);
  });

  test('сдвиг бедра в пикселях переводится в миллиметры', () => {
    expect(shiftMm(p(0, 0), p(10, 0), 1.7)).toBe(17);
  });

  test('нулевая длина шатуна не даёт масштаб', () => {
    expect(crankScale(p(0, 0), p(100, 0), 0)).toBeNull();
  });
});
