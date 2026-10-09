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
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";

export function forceGhostReverse(
  world: World,
  blockTunnels = false,
  onlyEids?: ReadonlySet<number>,
  blockTunnelRow: number | null = null,
): void {
  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Facing, Input, Position])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.active;
    if (
      phase === GHOST_PHASE.inHouse ||
      phase === GHOST_PHASE.leaving ||
      onlyEids?.has(eid) === false
    ) {
      continue;
    }

    const facing = (Facing.direction[eid] ?? DIRECTION.none) as GhostDir;
    const reversed = reverseGhostDir(facing) as Direction;
    if (reversed === DIRECTION.none) {
      continue;
    }

    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    const col = worldToCol(x);
    const row = worldToRow(y);
    const rules = ghostMovementRules(phase, blockTunnels, blockTunnelRow);
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
