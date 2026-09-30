import { hasComponent, query, type World } from "bitecs";
import {
  idleReleaseDue,
  pickIdleReleaseKind,
  shouldReleaseGhostAt,
  shouldReleaseKind,
  type GhostReleaseAdds,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import { leavingHouseTarget } from "../../domain/ghostHouseLeave";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_SPEED, GHOST_TUNNEL_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { worldToCol, worldToRow } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
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

function sendOut(world: World, eid: number): void {
  const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
  const x = Position.x[eid] ?? 0;
  const y = Position.y[eid] ?? 0;
  const col = worldToCol(x);
  const row = worldToRow(y);
  const target = leavingHouseTarget(col, row);
  const dir = directionTowardTile(col, row, target.col, target.row);
  GhostPhase.value[eid] = GHOST_PHASE.leaving;
  Input.direction[eid] = dir;
  Facing.direction[eid] = dir;
  Speed.px[eid] =
    kind === GHOST_KIND.blinky || hasComponent(world, eid, BossGhost)
      ? GHOST_SPEED
      : GHOST_TUNNEL_SPEED;
  Ghost.decidedCol[eid] = Number.NaN;
  Ghost.decidedRow[eid] = Number.NaN;
}

export function ghostRelease(
  world: World,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): boolean {
  let released = false;
  const idleCandidates = new Map<GhostKindId, number>();
  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Input, Facing, Speed])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      continue;
    }
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    const isBoss = hasComponent(world, eid, BossGhost);
    const ready = isBoss
      ? shouldReleaseGhostAt(clock, (BossGhost.releaseDelayMs[eid] ?? 0) + (adds.delayAddMs ?? 0))
      : shouldReleaseKind(kind, clock, collectedCount, afterLifeRelease, adds);
    if (!ready) {
      if (!isBoss && !idleCandidates.has(kind)) {
        idleCandidates.set(kind, eid);
      }
      continue;
    }
    sendOut(world, eid);
    released = true;
  }
  if (!released && idleReleaseDue(clock, adds.delayAddMs ?? 0)) {
    const kind = pickIdleReleaseKind([...idleCandidates.keys()]);
    const eid = kind === null ? undefined : idleCandidates.get(kind);
    if (eid !== undefined) {
      sendOut(world, eid);
      released = true;
    }
  }
  return released;
}
