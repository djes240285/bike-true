import { describe, expect, test } from 'bun:test';
import { readStroke, sampleTimes, type StrokeSample } from './stroke';

function row(t: number, knee: number | null, hip: number | null, back = 45, arm = 158): StrokeSample {
  return { t, knee, hip, back, arm };
}

describe('разбор оборотов', () => {
  test('низ педали — это пики колена, верх — впадины бедра', () => {
    const samples = [
      row(0, 140, 70),
      row(0.2, 155, 60),
      row(0.4, 170, 50),
      row(0.6, 155, 60),
      row(0.8, 140, 70),
      row(1.0, 155, 60),
      row(1.2, 168, 48),
      row(1.4, 155, 60),
      row(1.6, 140, 72),
    ];
    const stroke = readStroke(samples);
    expect(stroke.knee).toBe(169);
    expect(stroke.kneeSpread).toBe(2);
    expect(stroke.hip).toBe(49);
    expect(stroke.hipSpread).toBe(2);
    expect(stroke.back).toBe(45);
    expect(stroke.arm).toBe(158);
  });

  test('кадры без сустава не становятся оборотом', () => {
    const stroke = readStroke([
      row(0, null, null, 0, 0),
      row(0.2, 150, null),
      row(0.4, null, 60),
    ]);
    expect(stroke.knee).toBe(150);
    expect(stroke.hip).toBe(60);
    expect(stroke.kneeSpread).toBe(0);
    expect(stroke.back).toBe(45);
  });

  test('до полуминуты читается целиком, до минуты реже, дальше берётся первая минута', () => {
    const twelve = sampleTimes(12);
    expect(twelve[0]).toBe(0);
    expect(twelve[twelve.length - 1]).toBeGreaterThan(10);
    const thirty = sampleTimes(30);
    expect(thirty[thirty.length - 1]).toBeGreaterThan(29);
    expect(thirty.length).toBeGreaterThan(200);
    const minute = sampleTimes(60);
    expect(minute[minute.length - 1]).toBeGreaterThan(59);
    expect(minute.length).toBeLessThanOrEqual(241);
    const long = sampleTimes(90);
    expect(long[long.length - 1]).toBeGreaterThan(59);
    expect(long[long.length - 1]).toBeLessThanOrEqual(60);
    expect(sampleTimes(0.2)).toEqual([]);
  });

  test('пустой ролик не выдумывает углы', () => {
    expect(readStroke([])).toEqual({
      knee: null,
      hip: null,
      back: null,
      arm: null,
      kneeSpread: null,
      hipSpread: null,
    });
  });
});
