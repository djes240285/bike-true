export type FitId = 'city' | 'endurance' | 'race' | 'mtb';
export type RiderId = 'child' | 'teen' | 'adult';

export const FIT_IDS: FitId[] = ['city', 'endurance', 'race', 'mtb'];
export const RIDER_IDS: RiderId[] = ['child', 'teen', 'adult'];

export function isFit(value: unknown): value is FitId {
  return typeof value === 'string' && (FIT_IDS as string[]).includes(value);
}

export function isRider(value: unknown): value is RiderId {
  return typeof value === 'string' && (RIDER_IDS as string[]).includes(value);
}
