import { type World } from "bitecs";
import { SLIME_TRAIL_MAX_LEN, type RunCorruption } from "../../domain/corruption";
import { pushTrailTile } from "../../domain/ghostTrail";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { worldToCol, worldToRow } from "../../domain/maze";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { findGhostEidByKind } from "./corruptionGhost";

export function tickSlimeTrail(world: World, state: RunCorruption): RunCorruption {
  if (state.type !== "slimeTrail") {
    return state;
  }

  const eid = findGhostEidByKind(world, state.ghostKind);
  if (eid === null) {
    return state;
  }

  const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
  if (phase === GHOST_PHASE.inHouse) {
    return state;
  }

  const tile = { col: worldToCol(Position.x[eid] ?? 0), row: worldToRow(Position.y[eid] ?? 0) };
  const result = pushTrailTile(state.trail, tile, SLIME_TRAIL_MAX_LEN);
  return { ...state, trail: result.trail };
}
