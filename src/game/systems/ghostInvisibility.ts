import { query, type World } from "bitecs";
import {
  INVISIBILITY_REVEAL_RADIUS_TILES,
  isCorruptionFlashing,
  isInvisibilityHiddenInCycle,
  tickInvisibilityCycle,
  type RunCorruption,
} from "../../domain/corruption";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { worldToCol, worldToRow } from "../../domain/maze";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { findGhostEidByKind } from "./corruptionGhost";

export type InvisibilityTick = {
  corruption: RunCorruption;
  hiddenGhostEid: number | null;
  flashGhostEid: number | null;
};

export function tickInvisibility(
  world: World,
  state: RunCorruption,
  deltaMs: number,
): InvisibilityTick {
  if (state.type !== "invisibility") {
    return { corruption: state, hiddenGhostEid: null, flashGhostEid: null };
  }

  const ticked = tickInvisibilityCycle(state, deltaMs);
  const eid = findGhostEidByKind(world, ticked.ghostKind);
  const phase = eid !== null ? (GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) : GHOST_PHASE.inHouse;
  const inHouse = eid === null || phase === GHOST_PHASE.inHouse;
  const flashGhostEid = !inHouse && isCorruptionFlashing(ticked) ? eid : null;

  if (inHouse || !isInvisibilityHiddenInCycle(ticked)) {
    return { corruption: ticked, hiddenGhostEid: null, flashGhostEid };
  }

  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return { corruption: ticked, hiddenGhostEid: eid, flashGhostEid };
  }

  const dCol = Math.abs(worldToCol(Position.x[eid] ?? 0) - worldToCol(Position.x[playerEid] ?? 0));
  const dRow = Math.abs(worldToRow(Position.y[eid] ?? 0) - worldToRow(Position.y[playerEid] ?? 0));
  const revealed =
    dCol <= INVISIBILITY_REVEAL_RADIUS_TILES && dRow <= INVISIBILITY_REVEAL_RADIUS_TILES;

  return { corruption: ticked, hiddenGhostEid: revealed ? null : eid, flashGhostEid };
}
