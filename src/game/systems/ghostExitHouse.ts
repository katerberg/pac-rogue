import { query, type World } from "bitecs";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { hasLeftGhostHouse, worldToCol, worldToRow } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";

export function ghostExitHouse(world: World): boolean {
  let becameActive = false;

  for (const eid of query(world, [Ghost, GhostPhase, Position])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.leaving) {
      continue;
    }
    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    if (!hasLeftGhostHouse(col, row)) {
      continue;
    }
    GhostPhase.value[eid] = GHOST_PHASE.active;
    becameActive = true;
  }

  return becameActive;
}
