import { isNearMiss } from "./runLog";

export const NEAR_MISS_REARM_TILES = 1.5;

export type NearMissSample = { eid: number; distancePx: number; catchable: boolean };

export type NearMissPasses = ReadonlySet<number>;

export function createNearMissPasses(): NearMissPasses {
  return new Set();
}

export function stepNearMissPasses(
  passes: NearMissPasses,
  samples: readonly NearMissSample[],
  tileSize: number,
): { passes: NearMissPasses; completed: number } {
  const next = new Set<number>();
  let completed = 0;
  for (const { eid, distancePx, catchable } of samples) {
    const spent = passes.has(eid);
    if (spent && distancePx <= tileSize * NEAR_MISS_REARM_TILES) {
      next.add(eid);
    } else if (!spent && isNearMiss(distancePx, tileSize)) {
      next.add(eid);
      if (catchable) {
        completed += 1;
      }
    }
  }
  return { passes: next, completed };
}
