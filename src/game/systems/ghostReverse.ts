import { query, type World } from "bitecs";
import {
  GHOST_DIR,
  lCornerTurnDir,
  openGhostDirsAt,
  reverseGhostDir,
  type GhostDir,
} from "../../domain/ghostPath";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";

export function forceGhostReverse(world: World): void {
  for (const eid of query(world, [Ghost, GhostPhase, Facing, Input, Position])) {
    const facing = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    const reversed = reverseGhostDir(facing) as Direction;
    if (reversed === DIRECTION.none) {
      continue;
    }

    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    const col = worldToCol(x);
    const row = worldToRow(y);
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.active;
    const rules = ghostMovementRules(phase);
    const opens = openGhostDirsAt(x, y, rules.solids, rules.canEnter);

    let next: Direction = reversed;
    if (!opens.includes(reversed as GhostDir)) {
      const turn = lCornerTurnDir(opens, reversed as GhostDir);
      if (turn !== GHOST_DIR.none) {
        next = turn as Direction;
      }
    }

    Facing.direction[eid] = next;
    Input.direction[eid] = next;
    if (next === reversed && !opens.includes(reversed as GhostDir)) {
      Ghost.decidedCol[eid] = Number.NaN;
      Ghost.decidedRow[eid] = Number.NaN;
    } else {
      Ghost.decidedCol[eid] = col;
      Ghost.decidedRow[eid] = row;
    }
  }
}
