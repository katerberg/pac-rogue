import { isNearMiss } from "./runLog";

export const NEAR_MISS_REARM_TILES = 1.5;

export type NearMissSample = { eid: number; distancePx: number; catchable: boolean };

type PassPhase = "inside" | "spent";

export type NearMissPasses = ReadonlyMap<number, PassPhase>;

export function createNearMissPasses(): NearMissPasses {
  return new Map();
}

export function stepNearMissPasses(
  passes: NearMissPasses,
  samples: readonly NearMissSample[],
  tileSize: number,
): { passes: NearMissPasses; completed: number } {
  const next = new Map<number, PassPhase>();
  let completed = 0;
  for (const { eid, distancePx, catchable } of samples) {
    const near = isNearMiss(distancePx, tileSize);
    const rearmed = distancePx > tileSize * NEAR_MISS_REARM_TILES;
    const phase = passes.get(eid);
    if (phase === "inside" && catchable && !near) {
      completed += 1;
      if (!rearmed) {
        next.set(eid, "spent");
      }
    } else if (phase === "inside" || (phase === undefined && near)) {
      next.set(eid, catchable ? "inside" : "spent");
    } else if (phase === "spent" && !rearmed) {
      next.set(eid, "spent");
    }
  }
  return { passes: next, completed };
}
