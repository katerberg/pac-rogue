import { query, type World } from "bitecs";
import {
  GHOST_HOUSE_EXIT_COL,
  GHOST_HOUSE_EXIT_ROW,
  isAlignedForTurn,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";

export function ghostExitHouse(world: World): boolean {
  let becameActive = false;

  for (const eid of query(world, [Ghost, GhostPhase, Position])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.leaving) {
      continue;
    }
    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    if (!isAlignedForTurn(x, y)) {
      continue;
    }
    if (worldToCol(x) !== GHOST_HOUSE_EXIT_COL || worldToRow(y) !== GHOST_HOUSE_EXIT_ROW) {
      continue;
    }
    GhostPhase.value[eid] = GHOST_PHASE.active;
    becameActive = true;
  }

  return becameActive;
}
