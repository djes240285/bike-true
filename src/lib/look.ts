import type { RiderId } from './fits';

export type ThemeId = 'light' | 'dark';

export const THEME_KEY = 'bt_theme';
export const RIDER_LOOK_KEY = 'bt_rider';

export function themeFrom(value: string | null): ThemeId {
  return value === 'dark' ? 'dark' : 'light';
}

export function riderLookFrom(value: string | null): RiderId | '' {
  return value === 'child' || value === 'teen' || value === 'adult' ? value : '';
}

export function readTheme(): ThemeId {
  if (typeof localStorage === 'undefined') return 'light';
  return themeFrom(localStorage.getItem(THEME_KEY));
}

export function writeTheme(theme: ThemeId) {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.dataset.theme = theme;
}

export function readRiderLook(): RiderId | '' {
  if (typeof localStorage === 'undefined') return '';
  return riderLookFrom(localStorage.getItem(RIDER_LOOK_KEY));
}

export function writeRiderLook(rider: RiderId | '') {
  if (!rider) localStorage.removeItem(RIDER_LOOK_KEY);
  else localStorage.setItem(RIDER_LOOK_KEY, rider);
}
