import { type World } from "bitecs";
import { isCorruptionFlashing, type RunCorruption } from "../../domain/corruption";
import type { GhostTarget } from "../../domain/ghostTarget";
import { findGhostEidByKind } from "./corruptionGhost";
import { tickInvisibility } from "./ghostInvisibility";
import { tickPelletDropperTrail } from "./pelletDropperTrail";
import { tickSlimeTrail } from "./slimeTrail";
import { tickWallPhaseDash } from "./wallPhaseDash";

export type CorruptionStep = {
  corruption: RunCorruption;
  hiddenGhostEid: number | null;
  flashGhostEid: number | null;
  dropSpawnTiles: GhostTarget[];
};

export function stepCorruption(
  world: World,
  state: RunCorruption,
  deltaMs: number,
  pelletsRemaining: number,
): CorruptionStep {
  let corruption = tickWallPhaseDash(world, state, deltaMs);
  corruption = tickSlimeTrail(world, corruption);
  const dropperTick = tickPelletDropperTrail(world, corruption, deltaMs, pelletsRemaining);
  const invisTick = tickInvisibility(world, dropperTick.corruption, deltaMs);
  const next = invisTick.corruption;
  const flashGhostEid =
    next.type === "invisibility"
      ? invisTick.flashGhostEid
      : isCorruptionFlashing(next)
        ? findGhostEidByKind(world, next.ghostKind)
        : null;
  return {
    corruption: next,
    hiddenGhostEid: invisTick.hiddenGhostEid,
    flashGhostEid,
    dropSpawnTiles: dropperTick.spawnTiles,
  };
}
