import type { FitId } from './fits';

export type SavedBike = {
  id: number;
  name: string;
  fit: FitId;
  crank_mm: number | null;
  saddle_mm: number | null;
  stem_mm: number | null;
  drop_mm: number | null;
};

const EVENT = 'bt-bike';

export function publishBike(bike: SavedBike) {
  window.dispatchEvent(new CustomEvent<SavedBike>(EVENT, { detail: bike }));
}

export function subscribeBikes(onBike: (bike: SavedBike) => void) {
  const handler = (event: Event) => onBike((event as CustomEvent<SavedBike>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
