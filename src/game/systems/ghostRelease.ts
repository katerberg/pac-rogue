import { hasComponent, query, type World } from "bitecs";
import {
  idleReleaseDue,
  releaseAddsForKind,
  shouldReleaseGhostAt,
  shouldReleaseSlot,
  type GhostReleaseAdds,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import { leavingHouseTarget } from "../../domain/ghostHouseLeave";
import { RELEASE_SLOT, type ReleaseSlot } from "../../domain/ghostRoster";
import { GHOST_HOUSE_EXIT_SPEED, GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { worldToCol, worldToRow } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import type { GhostKindId } from "../../domain/ghostKind";
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

export function ghostReleaseSlot(eid: number): ReleaseSlot {
  return (Ghost.releaseSlot[eid] ?? RELEASE_SLOT.anchor) as ReleaseSlot;
}

export function sendGhostOutOfHouse(world: World, eid: number): void {
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
    ghostReleaseSlot(eid) === RELEASE_SLOT.anchor || hasComponent(world, eid, BossGhost)
      ? GHOST_SPEED
      : GHOST_HOUSE_EXIT_SPEED;
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
  let idleEid: number | undefined;
  let idleRank = Number.POSITIVE_INFINITY;
  for (const eid of query(world, [Ghost, GhostPhase, Position, Input, Facing, Speed])) {
    if (
      (GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse ||
      adds.heldGhostEids?.includes(eid) === true
    ) {
      continue;
    }
    const slot = ghostReleaseSlot(eid);
    const isBoss = hasComponent(world, eid, BossGhost);
    const ready = isBoss
      ? shouldReleaseGhostAt(clock, (BossGhost.releaseDelayMs[eid] ?? 0) + (adds.delayAddMs ?? 0))
      : shouldReleaseSlot(
          slot,
          clock,
          collectedCount,
          afterLifeRelease,
          releaseAddsForKind(adds, (GhostKind.kind[eid] ?? 0) as GhostKindId),
        );
    if (!ready) {
      if (!isBoss && slot < idleRank) {
        idleEid = eid;
        idleRank = slot;
      }
      continue;
    }
    sendGhostOutOfHouse(world, eid);
    released = true;
  }
  if (!released && idleReleaseDue(clock, adds.delayAddMs ?? 0, adds.tuning)) {
    if (idleEid !== undefined) {
      sendGhostOutOfHouse(world, idleEid);
      released = true;
    }
  }
  return released;
}
