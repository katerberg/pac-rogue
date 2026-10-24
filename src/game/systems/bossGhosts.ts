import { query, type World } from "bitecs";
import { bossTunnelMouths, type BossTunnelMouth } from "../../domain/bossBoard";
import { tileKey } from "../../domain/bossGhostBlocking";
import { ghostDirStep, reverseGhostDir, type GhostDir } from "../../domain/ghostPath";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  TILE_SIZE,
  worldToCol,
  worldToRow,
} from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

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

export function occupiedBossGhostTiles(
  world: World,
  exceptEid: number,
  alsoExceptEid: number | null = null,
): Set<string> {
  const tiles = new Set<string>();
  for (const eid of activeBossGhosts(world)) {
    if (eid !== exceptEid && eid !== alsoExceptEid) {
      tiles.add(tileKey(worldToCol(Position.x[eid] ?? 0), worldToRow(Position.y[eid] ?? 0)));
    }
  }
  return tiles;
}

export function pickFreeBossMouth(
  world: World,
  mouths: readonly BossTunnelMouth[],
  startIndex: number,
): number | null {
  const ghostTiles = activeBossGhosts(world).map((eid) => ({
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
  }));
  const playerRows = new Set(
    [...query(world, [Player, Position])].map((eid) => worldToRow(Position.y[eid] ?? 0)),
  );
  for (let offset = 0; offset < mouths.length; offset += 1) {
    const index = (startIndex + offset) % mouths.length;
    const mouth = mouths[index]!;
    if (playerRows.has(mouth.row)) {
      continue;
    }
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

export function placeGhostAtMouth(eid: number, mouth: BossTunnelMouth): void {
  Position.x[eid] = cellCenterX(mouth.col);
  Position.y[eid] = cellCenterY(mouth.row);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  GhostPhase.value[eid] = GHOST_PHASE.active;
  Facing.direction[eid] = mouth.facing;
  Input.direction[eid] = mouth.facing;
  Ghost.decidedCol[eid] = Number.NaN;
  Ghost.decidedRow[eid] = Number.NaN;
}

export function sendGhostToFarthestMouth(world: World, eid: number): void {
  const player = query(world, [Player, Position])[0];
  if (player === undefined) {
    return;
  }
  const px = Position.x[player] ?? 0;
  const py = Position.y[player] ?? 0;
  let farthest: BossTunnelMouth | null = null;
  let farthestDist = -1;
  for (const mouth of bossTunnelMouths(getActiveLayout().playerSolids)) {
    const dist = Math.hypot(cellCenterX(mouth.col) - px, cellCenterY(mouth.row) - py);
    if (dist > farthestDist) {
      farthest = mouth;
      farthestDist = dist;
    }
  }
  if (farthest !== null) {
    placeGhostAtMouth(eid, farthest);
  }
}

export function bossGhostBlock(world: World): void {
  const ghosts = activeBossGhosts(world);
  const reach = TILE_SIZE * HEAD_ON_REACH_TILES;
  const halfTile = TILE_SIZE / 2;
  const toReverse: number[] = [];
  for (const eid of ghosts) {
    const { dx, dy } = ghostDirStep((Facing.direction[eid] ?? DIRECTION.none) as GhostDir);
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
