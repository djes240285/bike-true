import { describe, expect, test } from 'bun:test';
import { BIKE_LIMIT, cabinetNext, cmSuggestion, mmFits, overLimit, parseBike, parseDisplayName, parseMmInput, parseProfile, parseReading, READING_LIMIT } from './account';

describe('profile', () => {
  test('крайние рост и шов проходят, шов меньше роста', () => {
    expect(parseProfile({ rider: 'adult', height_cm: 90, inseam_cm: 40 })).toEqual({
      ok: true,
      profile: { rider: 'adult', heightCm: 90, inseamCm: 40 },
    });
    expect(parseProfile({ rider: 'adult', height_cm: 220, inseam_cm: 110 })).toEqual({
      ok: true,
      profile: { rider: 'adult', heightCm: 220, inseamCm: 110 },
    });
  });

  test('шаг за краем и шов не меньше роста отклоняются', () => {
    expect(parseProfile({ rider: 'adult', height_cm: 89, inseam_cm: null }).ok).toBe(false);
    expect(parseProfile({ rider: 'adult', height_cm: 221, inseam_cm: null })).toMatchObject({ error: 'height' });
    expect(parseProfile({ rider: 'adult', height_cm: null, inseam_cm: 39 })).toMatchObject({ error: 'inseam' });
    expect(parseProfile({ rider: 'adult', height_cm: null, inseam_cm: 111 })).toMatchObject({ error: 'inseam' });
    expect(parseProfile({ rider: 'child', height_cm: 110, inseam_cm: 110 })).toMatchObject({ error: 'inseam' });
  });

  test('пустые мерки стираются в null, чужой rider нет', () => {
    expect(parseProfile({ rider: null, height_cm: '', inseam_cm: null })).toEqual({
      ok: true,
      profile: { rider: null, heightCm: null, inseamCm: null },
    });
    expect(parseProfile({ rider: 'woman', height_cm: null, inseam_cm: null })).toMatchObject({ error: 'rider' });
  });

  test('картинка в мерках отклоняется', () => {
    expect(parseProfile({ rider: 'adult', height_cm: 180, inseam_cm: 86, photo: 'x' })).toMatchObject({ error: 'photo' });
  });
});

describe('bike', () => {
  test('края размеров проходят, пустые размеры допустимы', () => {
    expect(parseBike({ name: ' Гравий ', fit: 'endurance', crank_mm: 120, saddle_mm: 400, stem_mm: 30, drop_mm: -150 })).toEqual({
      ok: true,
      bike: { name: 'Гравий', fit: 'endurance', crankMm: 120, saddleMm: 400, stemMm: 30, dropMm: -150 },
    });
    expect(parseBike({ name: 'Шоссе', fit: 'race', crank_mm: 180, saddle_mm: 1000, stem_mm: 150, drop_mm: 200 }).ok).toBe(true);
    expect(parseBike({ name: 'Город', fit: 'city', crank_mm: null, saddle_mm: '', stem_mm: null, drop_mm: null }).ok).toBe(true);
  });

  test('ввод принимает половину миллиметра и подсказывает сантиметры', () => {
    expect(parseMmInput('')).toBeNull();
    expect(parseMmInput('172,5')).toBe(173);
    expect(parseMmInput('17.5')).toBe(18);
    expect(parseMmInput('17.2')).toBeUndefined();
    expect(mmFits('crank_mm', 18)).toBe(false);
    expect(mmFits('crank_mm', 175)).toBe(true);
    expect(cmSuggestion('crank_mm', '17,5')).toBe(175);
    expect(cmSuggestion('stem_mm', '11')).toBe(110);
    expect(cmSuggestion('saddle_mm', '27,5')).toBeNull();
    expect(cmSuggestion('drop_mm', '4,5')).toBeNull();
  });

  test('имя, посадка и шаг за краем отклоняются', () => {
    expect(parseBike({ name: '   ', fit: 'city' })).toMatchObject({ error: 'name' });
    expect(parseBike({ name: 'А', fit: 'gravel' })).toMatchObject({ error: 'fit' });
    expect(parseBike({ name: 'А', fit: 'mtb', crank_mm: 119 })).toMatchObject({ error: 'bike' });
    expect(parseBike({ name: 'А', fit: 'mtb', drop_mm: 201 })).toMatchObject({ error: 'bike' });
    expect(parseBike({ name: 'А'.repeat(41), fit: 'city' })).toMatchObject({ error: 'name' });
  });
});

describe('reading', () => {
  test('целые градусы и пустой велосипед проходят', () => {
    const result = parseReading({ fit: 'race', bike_id: null, knee: 145, back: null, arm: null, hip: null, had_top: false });
    expect(result).toEqual({
      ok: true,
      reading: { fit: 'race', bikeId: null, knee: 145, back: null, arm: null, hip: null, hadTop: false },
    });
  });

  test('без углов, дробный угол и картинка отклоняются', () => {
    expect(parseReading({ fit: 'endurance', knee: null, back: null, arm: null, hip: null })).toMatchObject({ error: 'angles' });
    expect(parseReading({ fit: 'endurance', knee: 145.4, back: null, arm: null, hip: null })).toMatchObject({ error: 'angles' });
    expect(parseReading({ fit: 'endurance', knee: 145, dataUrl: 'abc' })).toMatchObject({ error: 'photo' });
    expect(parseReading({ fit: 'nope', knee: 145 })).toMatchObject({ error: 'fit' });
    expect(parseReading({ fit: 'city', bike_id: 0, knee: 145 })).toMatchObject({ error: 'bike' });
  });
});

describe('limits and next', () => {
  test('лимит считается по уже лежащим строкам', () => {
    expect(overLimit(19, BIKE_LIMIT)).toBe(false);
    expect(overLimit(20, BIKE_LIMIT)).toBe(true);
    expect(overLimit(100, READING_LIMIT)).toBe(true);
  });

  test('возврат после входа остаётся на этом сайте', () => {
    expect(cabinetNext('/analyze')).toBe('/analyze');
    expect(cabinetNext('/en/analyze')).toBe('/en/analyze');
    expect(cabinetNext(null)).toBe('/account');
    expect(cabinetNext('https://evil.example/steal')).toBe('/account');
  });

  test('имя кабинета от 1 до 80 символов', () => {
    expect(parseDisplayName('  Женя  ')).toEqual({ ok: true, name: 'Женя' });
    expect(parseDisplayName('   ')).toMatchObject({ error: 'name' });
    expect(parseDisplayName('Я'.repeat(81))).toMatchObject({ error: 'name' });
  });
});
