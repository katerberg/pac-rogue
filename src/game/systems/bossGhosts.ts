import { query, type World } from "bitecs";
import type { BossTunnelMouth } from "../../domain/bossBoard";
import { tileKey } from "../../domain/bossGhostBlocking";
import { reverseGhostDir, type GhostDir } from "../../domain/ghostPath";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { TILE_SIZE, worldToCol, worldToRow } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Position } from "../components/Position";

const MOUTH_CLEARANCE_TILES = 2;
const HEAD_ON_REACH_TILES = 1.25;

function activeBossGhosts(world: World): number[] {
  return [...query(world, [Ghost, BossGhost, GhostPhase, Position])].filter(
    (eid) => GhostPhase.value[eid] === GHOST_PHASE.active,
  );
}

export function countBossPellets(world: World): number {
  return query(world, [BossPellet]).length;
}

export function occupiedBossGhostTiles(world: World, exceptEid: number): Set<string> {
  const tiles = new Set<string>();
  for (const eid of activeBossGhosts(world)) {
    if (eid !== exceptEid) {
      tiles.add(tileKey(worldToCol(Position.x[eid] ?? 0), worldToRow(Position.y[eid] ?? 0)));
    }
  }
  return tiles;
}

// First mouth, rotating from startIndex, with no active boss ghost within the clearance.
export function pickFreeBossMouth(
  world: World,
  mouths: readonly BossTunnelMouth[],
  startIndex: number,
): number | null {
  const ghostTiles = activeBossGhosts(world).map((eid) => ({
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
  }));
  for (let offset = 0; offset < mouths.length; offset += 1) {
    const index = (startIndex + offset) % mouths.length;
    const mouth = mouths[index]!;
    const blocked = ghostTiles.some(
      (tile) =>
        Math.max(Math.abs(tile.col - mouth.col), Math.abs(tile.row - mouth.row)) <=
        MOUTH_CLEARANCE_TILES,
    );
    if (!blocked) {
      return index;
    }
  }
  return null;
}

function facingVector(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case DIRECTION.up:
      return { dx: 0, dy: -1 };
    case DIRECTION.down:
      return { dx: 0, dy: 1 };
    case DIRECTION.left:
      return { dx: -1, dy: 0 };
    case DIRECTION.right:
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

// Boss ghosts are walls to each other: a ghost with another boss ghost just ahead on its
// line of travel turns around (so two meeting head-on both reverse).
export function bossGhostBlock(world: World): void {
  const ghosts = activeBossGhosts(world);
  const reach = TILE_SIZE * HEAD_ON_REACH_TILES;
  const halfTile = TILE_SIZE / 2;
  const toReverse: number[] = [];
  for (const eid of ghosts) {
    const facing = (Facing.direction[eid] ?? DIRECTION.none) as Direction;
    const { dx, dy } = facingVector(facing);
    if (dx === 0 && dy === 0) {
      continue;
    }
    const x = Position.x[eid] ?? 0;
    const y = Position.y[eid] ?? 0;
    const blocked = ghosts.some((other) => {
      if (other === eid) {
        return false;
      }
      const ox = (Position.x[other] ?? 0) - x;
      const oy = (Position.y[other] ?? 0) - y;
      const along = ox * dx + oy * dy;
      const across = Math.abs(ox * dy - oy * dx);
      return along > 0 && along <= reach && across < halfTile;
    });
    if (blocked) {
      toReverse.push(eid);
    }
  }
  for (const eid of toReverse) {
    const reversed = reverseGhostDir(Facing.direction[eid] as GhostDir) as Direction;
    Facing.direction[eid] = reversed;
    Input.direction[eid] = reversed;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
  }
}
