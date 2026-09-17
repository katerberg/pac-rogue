import { query, type World } from "bitecs";
import { shouldReleaseKind, type GhostReleaseClock } from "../../domain/ghostRelease";
import { leavingHouseTarget } from "../../domain/ghostHouseLeave";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";

function directionTowardTile(
  col: number,
  row: number,
  targetCol: number,
  targetRow: number,
): Direction {
  if (col !== targetCol) {
    return col < targetCol ? DIRECTION.right : DIRECTION.left;
  }
  if (row !== targetRow) {
    return row < targetRow ? DIRECTION.down : DIRECTION.up;
  }
  return DIRECTION.up;
}

export function ghostRelease(
  world: World,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
): void {
  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Input, Facing, Speed])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      continue;
    }
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    if (!shouldReleaseKind(kind, clock, collectedCount, afterLifeRelease)) {
      continue;
    }
    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    const col = worldToCol(x);
    const row = worldToRow(y);
    const target = leavingHouseTarget(col, row);
    const dir = directionTowardTile(col, row, target.col, target.row);
    GhostPhase.value[eid] = GHOST_PHASE.leaving;
    Input.direction[eid] = dir;
    Facing.direction[eid] = dir;
    Speed.px[eid] = GHOST_SPEED;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
  }
}
