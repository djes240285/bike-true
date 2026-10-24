import { describe, expect, test } from 'bun:test';
import { readingSetup } from './reading-setup';

const shot = {
  captured: false,
  bikeId: 4,
  rider: null,
  heightCm: null,
  inseamCm: null,
  crankMm: null,
  saddleMm: null,
  stemMm: null,
  dropMm: null,
};

describe('слепок разбора', () => {
  test('сохранённый кадр не подменяется сегодняшними числами', () => {
    const setup = readingSetup(
      { ...shot, captured: true, saddleMm: 740, heightCm: 180 },
      { profile: { rider: 'adult', heightCm: 190, inseamCm: 90 }, bikes: [{ id: 4, crankMm: 175, saddleMm: 800, stemMm: 90, dropMm: 40 }] },
    );
    expect(setup.source).toBe('shot');
    expect(setup.saddleMm).toBe(740);
    expect(setup.heightCm).toBe(180);
    expect(setup.crankMm).toBeNull();
  });

  test('старый кадр берёт текущий велосипед и мерки', () => {
    const setup = readingSetup(shot, {
      profile: { rider: 'adult', heightCm: 178, inseamCm: 84 },
      bikes: [{ id: 4, crankMm: 170, saddleMm: 760, stemMm: 100, dropMm: 30 }],
    });
    expect(setup).toMatchObject({ source: 'today', heightCm: 178, saddleMm: 760, stemMm: 100, crankMm: 170 });
  });

  test('без своих данных старый кадр ничего не выдумывает', () => {
    expect(readingSetup(shot, null).source).toBe('none');
    expect(readingSetup({ ...shot, bikeId: null }, { profile: null, bikes: [] }).saddleMm).toBeNull();
  });
});
