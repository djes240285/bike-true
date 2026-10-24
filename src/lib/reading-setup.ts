import type { RiderId } from './fits';

export type SetupSource = 'shot' | 'today' | 'none';

export type ReadingSetup = {
  source: SetupSource;
  rider: RiderId | null;
  heightCm: number | null;
  inseamCm: number | null;
  crankMm: number | null;
  saddleMm: number | null;
  stemMm: number | null;
  dropMm: number | null;
};

type Shot = {
  captured: boolean;
  bikeId: number | null;
  rider: RiderId | null;
  heightCm: number | null;
  inseamCm: number | null;
  crankMm: number | null;
  saddleMm: number | null;
  stemMm: number | null;
  dropMm: number | null;
};

type Live = {
  profile: { rider: RiderId | null; heightCm: number | null; inseamCm: number | null } | null;
  bikes: { id: number; crankMm: number | null; saddleMm: number | null; stemMm: number | null; dropMm: number | null }[];
};

const empty = {
  rider: null,
  heightCm: null,
  inseamCm: null,
  crankMm: null,
  saddleMm: null,
  stemMm: null,
  dropMm: null,
};

/** Слепок с дня кадра. Если его не было — сегодняшние мерки, и только для своего кабинета. */
export function readingSetup(shot: Shot, live: Live | null): ReadingSetup {
  if (shot.captured) {
    return {
      source: 'shot',
      rider: shot.rider,
      heightCm: shot.heightCm,
      inseamCm: shot.inseamCm,
      crankMm: shot.crankMm,
      saddleMm: shot.saddleMm,
      stemMm: shot.stemMm,
      dropMm: shot.dropMm,
    };
  }
  if (!live) return { source: 'none', ...empty };
  const bike = live.bikes.find((item) => item.id === shot.bikeId);
  return {
    source: 'today',
    rider: live.profile?.rider ?? null,
    heightCm: live.profile?.heightCm ?? null,
    inseamCm: live.profile?.inseamCm ?? null,
    crankMm: bike?.crankMm ?? null,
    saddleMm: bike?.saddleMm ?? null,
    stemMm: bike?.stemMm ?? null,
    dropMm: bike?.dropMm ?? null,
  };
}
