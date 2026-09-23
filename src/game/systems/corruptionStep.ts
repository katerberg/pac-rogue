import { type World } from "bitecs";
import type { RunCorruption } from "../../domain/corruption";
import type { GhostTarget } from "../../domain/ghostTarget";
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
  return {
    corruption: invisTick.corruption,
    hiddenGhostEid: invisTick.hiddenGhostEid,
    flashGhostEid: invisTick.flashGhostEid,
    dropSpawnTiles: dropperTick.spawnTiles,
  };
}
