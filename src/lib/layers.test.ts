import { describe, expect, test } from 'bun:test';
import { corridorFor, explainFactors, layerNotes, leadingNote, readingsSplit, splitAngles } from './layers';

const open = { knee: 145, back: 42, arm: 158, hip: 62 };

describe('слои на коридор', () => {
  test('без тела коридор прежний', () => {
    expect(corridorFor('knee', null)).toEqual({ min: 140, max: 150 });
    expect(corridorFor('back', {})).toEqual({ min: 35, max: 50 });
  });

  test('тугая лодыжка не пускает колено в полный разгиб', () => {
    expect(corridorFor('knee', { ankle: 'cant' }).max).toBe(142);
    expect(corridorFor('knee', { ankle: 'effort' }).max).toBe(146);
  });

  test('короткая задняя цепь поднимает нижнюю границу спины', () => {
    expect(corridorFor('back', { posterior: 'effort' }).min).toBe(42);
    expect(corridorFor('back', { posterior: 'cant' }).min).toBe(46);
  });

  test('мало сгибания бедра не даёт закрывать угол', () => {
    expect(corridorFor('hip', { hip: 'cant' }).min).toBe(64);
  });

  test('тугое плечо не требует прямой руки', () => {
    expect(corridorFor('arm', { shoulder: 'effort' }).max).toBe(160);
  });
});

describe('заметки слоёв', () => {
  test('длинный шатун объясняет слишком прямое колено', () => {
    expect(layerNotes({ ...open, knee: 160 }, { crankMm: 175, stemMm: 90 }, null)).toContain('knee-crank');
  });

  test('шатун молчит, если колено в коридоре', () => {
    expect(layerNotes(open, { crankMm: 175, stemMm: 90 }, null)).not.toContain('knee-crank');
  });

  test('длинный вынос объясняет прямую руку, короткий — согнутую', () => {
    expect(layerNotes({ ...open, arm: 172 }, { crankMm: 170, stemMm: 120 }, null)).toContain('arm-stem-long');
    expect(layerNotes({ ...open, arm: 140 }, { crankMm: 170, stemMm: 70 }, null)).toContain('arm-stem-short');
  });

  test('тело добавляет свою заметку, только когда угол упирается в новый коридор', () => {
    expect(layerNotes({ ...open, back: 38 }, null, { posterior: 'cant' })).toContain('back-posterior');
    expect(layerNotes({ ...open, back: 48 }, null, { posterior: 'cant' })).not.toContain('back-posterior');
    expect(layerNotes({ ...open, knee: 148 }, null, { ankle: 'cant' })).toContain('knee-ankle');
    expect(layerNotes({ ...open, hip: 58 }, null, { hip: 'cant' })).toContain('hip-flex');
    expect(layerNotes({ ...open, arm: 162 }, null, { shoulder: 'cant' })).toContain('arm-shoulder');
  });

  test('большое падение объясняет низкий корпус, малое — вертикальный', () => {
    const bike = { crankMm: 170, stemMm: 90, dropMm: 100 };
    expect(layerNotes({ ...open, back: 28 }, bike, null)).toContain('back-drop-flat');
    expect(layerNotes({ ...open, back: 60 }, { ...bike, dropMm: 0 }, null)).toContain('back-drop-up');
    expect(layerNotes({ ...open, back: 42 }, bike, null)).not.toContain('back-drop-flat');
  });

  test('длинный шатун забирает совет у седла, градус остаётся', () => {
    const reading = { ...open, knee: 160 };
    const bike = { crankMm: 175, stemMm: 90 };
    expect(leadingNote('knee', reading, bike, null)).toBe('knee-crank');
    expect(reading.knee).toBe(160);
  });
});

describe('согласие слоёв', () => {
  test('разница больше 8° — слои не сходятся', () => {
    expect(splitAngles({ ...open, knee: 151 }, { ...open, knee: 160 })).toEqual(['knee']);
    expect(splitAngles({ ...open, knee: 151 }, { ...open, knee: 156 })).toEqual([]);
  });

  test('два ролика сбоку не усредняются, если разошлись', () => {
    expect(readingsSplit([{ ...open, knee: 150 }, { ...open, knee: 164 }])).toEqual(['knee']);
    expect(readingsSplit([{ ...open, knee: 150 }, { ...open, knee: 156 }])).toEqual([]);
  });
});

describe('что вошло в расчёт', () => {
  test('размер молчит внутри коридора и говорит, когда угол уже вышел', () => {
    const quiet = explainFactors(open, { crankMm: 175, stemMm: 120, dropMm: 100, saddleMm: 720 }, null);
    expect(quiet.find((row) => row.code === 'crank')?.state).toBe('quiet');
    expect(quiet.find((row) => row.code === 'saddle')?.state).toBe('quiet');
    const loud = explainFactors({ ...open, knee: 160, arm: 170 }, { crankMm: 175, stemMm: 120, dropMm: 10, saddleMm: null }, null);
    expect(loud.find((row) => row.code === 'crank')?.state).toBe('speaks');
    expect(loud.find((row) => row.code === 'stem')?.state).toBe('speaks');
    expect(loud.find((row) => row.code === 'drop')?.state).toBe('quiet');
    expect(loud.find((row) => row.code === 'saddle')?.state).toBe('missing');
  });

  test('запас тела двигает коридор и не переписывает градус', () => {
    const reading = { ...open, back: 40 };
    const rows = explainFactors(reading, null, { posterior: 'cant' });
    const back = rows.find((row) => row.code === 'posterior');
    expect(back?.state).toBe('speaks');
    expect(back?.corridor).toEqual({ min: 46, max: 50 });
    expect(reading.back).toBe(40);
    expect(explainFactors(open, null, { ankle: 'easy' }).find((row) => row.code === 'ankle')?.state).toBe('hold');
  });
});
