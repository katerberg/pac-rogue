import { hasComponent, query, type World } from "bitecs";
import { scatterTargetForKind, ghostTeleportCell } from "../../domain/ghostCorner";
import type { GhostCornerWarp } from "../../domain/ghostCornerWarp";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "../../domain/maze";
import { startWarpGlide } from "../../domain/warpGlide";
import { BossGhost } from "../components/BossGhost";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";

export const SHARED_CORNER_STAGGER_MS = 500;

export function teleportGhostsToCorners(world: World, holdMs: number): GhostCornerWarp[] {
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return [];
  }
  const player = {
    col: worldToCol(Position.x[playerEid] ?? 0),
    row: worldToRow(Position.y[playerEid] ?? 0),
  };

  const warps: GhostCornerWarp[] = [];
  const landed = new Map<string, number>();
  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Velocity, Speed])) {
    if (GhostPhase.value[eid] !== GHOST_PHASE.active) {
      continue;
    }
    const target = hasComponent(world, eid, BossGhost)
      ? { col: BossGhost.scatterCol[eid] ?? 0, row: BossGhost.scatterRow[eid] ?? 0 }
      : scatterTargetForKind((GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId);
    const cell = ghostTeleportCell(target, player);
    const key = `${cell.col},${cell.row}`;
    const sharing = landed.get(key) ?? 0;
    landed.set(key, sharing + 1);
    const from = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
    const to = { x: cellCenterX(cell.col), y: cellCenterY(cell.row) };
    Position.x[eid] = to.x;
    Position.y[eid] = to.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Speed.px[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Facing.direction[eid] = DIRECTION.none;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    warps.push({
      eid,
      glide: startWarpGlide(from, to),
      holdMs: holdMs + sharing * SHARED_CORNER_STAGGER_MS,
    });
  }
  return warps;
}
