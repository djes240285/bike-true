import { describe, expect, test } from 'bun:test';
import { isFit, isRider } from './fits';

describe('fits', () => {
  test('известные посадки и роли проходят', () => {
    expect(isFit('city')).toBe(true);
    expect(isFit('endurance')).toBe(true);
    expect(isFit('race')).toBe(true);
    expect(isFit('mtb')).toBe(true);
    expect(isRider('child')).toBe(true);
    expect(isRider('teen')).toBe(true);
    expect(isRider('adult')).toBe(true);
  });

  test('чужое слово не проходит', () => {
    expect(isFit('gravel')).toBe(false);
    expect(isFit('')).toBe(false);
    expect(isRider('woman')).toBe(false);
  });
});
