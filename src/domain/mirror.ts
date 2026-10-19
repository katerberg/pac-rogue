import { GHOST_DIR, type GhostDir } from "./ghostPath";
import type { MazeTile, SolidGrid } from "./maze";
import { speedZoneAt, speedZoneEffect, type SpeedZone, type SpeedZoneEffect } from "./speedZones";

export const MIRROR_ALPHA = 0.55;
export const MIRROR_TINT = 0xb48cff;
export const MIRROR_POP_MS = 700;
const MIRROR_TOUCH_TILES = 0.5;
const MIRROR_POP_BLINK_SHARE = 0.5;
const MIRROR_POP_BLINK_STEP_MS = 60;
const MIRROR_POP_BLINK_DIM_ALPHA = 0.15;
const MIRROR_DUST_COUNT = 20;
const MIRROR_DUST_MIN_REACH_TILES = 0.8;
const MIRROR_DUST_REACH_SPREAD_TILES = 1.6;
const MIRROR_DUST_SIZE_TILES = 0.28;
const MIRROR_DUST_PEAK_ALPHA = 0.9;
const MIRROR_DUST_FADE_POWER = 1.5;
const MIRROR_DUST_RISE_TILES = 0.6;

export type BodyTile = MazeTile & { facing: GhostDir };
export type MirrorPop = { x: number; y: number; elapsedMs: number };

export function mirrorX(x: number, centerX: number): number {
  return 2 * centerX - x;
}

export function twinPoint(
  player: { x: number; y: number },
  layout: { offsetX: number; pixelWidth: number },
): { x: number; y: number } {
  return { x: mirrorX(player.x, layout.offsetX + layout.pixelWidth / 2), y: player.y };
}

export function twinTouchesPlayer(
  player: { x: number; y: number },
  layout: { offsetX: number; pixelWidth: number; tileSize: number },
): boolean {
  return Math.abs(twinPoint(player, layout).x - player.x) < layout.tileSize * MIRROR_TOUCH_TILES;
}

export function mirrorCol(col: number, cols: number): number {
  return cols - 1 - col;
}

const MIRRORED_FACING: Readonly<Record<number, number>> = {
  [GHOST_DIR.left]: GHOST_DIR.right,
  [GHOST_DIR.right]: GHOST_DIR.left,
  5: 6,
  6: 5,
  7: 8,
  8: 7,
};

export function mirrorFacing(facing: number): number {
  return MIRRORED_FACING[facing] ?? facing;
}

function solidAt(solids: SolidGrid, col: number, row: number): boolean {
  return solids[row]?.[col] ?? true;
}

export function twinDesynced(solids: SolidGrid, player: MazeTile): boolean {
  const cols = solids[0]?.length ?? 0;
  return (
    solidAt(solids, mirrorCol(player.col, cols), player.row) &&
    !solidAt(solids, player.col, player.row)
  );
}

export function twinZoneEffect(
  zones: readonly SpeedZone[],
  twin: MazeTile,
  velocity: { x: number; y: number },
): SpeedZoneEffect | null {
  const zone = speedZoneAt(zones, twin.col, twin.row);
  return zone === null ? null : speedZoneEffect(zone, -velocity.x, velocity.y);
}

export function sharedZoneEffect(
  player: SpeedZoneEffect | null,
  twin: SpeedZoneEffect | null,
): { effect: SpeedZoneEffect | null; conflict: boolean } {
  return {
    effect: player ?? twin,
    conflict: player !== null && twin !== null && player !== twin,
  };
}

export function pathLength(solids: SolidGrid, from: MazeTile, to: MazeTile): number {
  const rows = solids.length;
  const cols = solids[0]?.length ?? 0;
  if (solidAt(solids, to.col, to.row)) {
    return Number.POSITIVE_INFINITY;
  }
  const heuristic = (col: number, row: number): number => {
    const dCol = Math.abs(col - to.col);
    return Math.min(dCol, cols - dCol) + Math.abs(row - to.row);
  };
  const goalIndex = to.row * cols + to.col;
  const best = new Map<number, number>([[from.row * cols + from.col, 0]]);
  const open = new Set(best.keys());
  while (open.size > 0) {
    let index = -1;
    let lowest = Number.POSITIVE_INFINITY;
    for (const candidate of open) {
      const f = best.get(candidate)! + heuristic(candidate % cols, Math.floor(candidate / cols));
      if (f < lowest) {
        lowest = f;
        index = candidate;
      }
    }
    open.delete(index);
    const g = best.get(index)!;
    if (index === goalIndex) {
      return g;
    }
    const col = index % cols;
    const row = Math.floor(index / cols);
    for (const [dCol, dRow] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nextRow = row + dRow;
      const nextCol = (col + dCol + cols) % cols;
      if (nextRow < 0 || nextRow >= rows || solidAt(solids, nextCol, nextRow)) {
        continue;
      }
      const nextIndex = nextRow * cols + nextCol;
      if (g + 1 < (best.get(nextIndex) ?? Number.POSITIVE_INFINITY)) {
        best.set(nextIndex, g + 1);
        open.add(nextIndex);
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}

function straightLineSq(a: MazeTile, b: MazeTile): number {
  return (a.col - b.col) ** 2 + (a.row - b.row) ** 2;
}

export function nearestBody(
  ghost: MazeTile,
  player: BodyTile,
  twin: BodyTile | null,
  solids: SolidGrid,
): BodyTile {
  if (twin === null) {
    return player;
  }
  const viaPlayer = pathLength(solids, ghost, player);
  const viaTwin = pathLength(solids, ghost, twin);
  if (viaPlayer === viaTwin && !Number.isFinite(viaPlayer)) {
    return straightLineSq(ghost, twin) < straightLineSq(ghost, player) ? twin : player;
  }
  return viaTwin < viaPlayer ? twin : player;
}

export function tickMirrorPop(pop: MirrorPop | null, deltaMs: number): MirrorPop | null {
  if (pop === null) {
    return null;
  }
  const elapsedMs = pop.elapsedMs + deltaMs;
  return elapsedMs >= MIRROR_POP_MS ? null : { ...pop, elapsedMs };
}

export function mirrorPopRender(
  pop: MirrorPop | null,
): { x: number; y: number; progress: number } | null {
  return pop === null
    ? null
    : { x: pop.x, y: pop.y, progress: Math.min(1, pop.elapsedMs / MIRROR_POP_MS) };
}

function unitHash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function mirrorPopLook(progress: number): { bodyAlpha: number; dustProgress: number } {
  const t = Math.min(1, Math.max(0, progress));
  if (t >= MIRROR_POP_BLINK_SHARE) {
    return {
      bodyAlpha: 0,
      dustProgress: (t - MIRROR_POP_BLINK_SHARE) / (1 - MIRROR_POP_BLINK_SHARE),
    };
  }
  const step = Math.floor((t * MIRROR_POP_MS) / MIRROR_POP_BLINK_STEP_MS);
  return {
    bodyAlpha: step % 2 === 0 ? MIRROR_ALPHA : MIRROR_POP_BLINK_DIM_ALPHA,
    dustProgress: 0,
  };
}

export type MirrorDust = { dx: number; dy: number; alpha: number; size: number };

export function mirrorDust(dustProgress: number, tilePx: number): MirrorDust[] {
  if (dustProgress <= 0) {
    return [];
  }
  const p = Math.min(1, dustProgress);
  const eased = 1 - (1 - p) ** 3;
  return Array.from({ length: MIRROR_DUST_COUNT }, (_, i) => {
    const angle = unitHash(i) * Math.PI * 2;
    const reach =
      (MIRROR_DUST_MIN_REACH_TILES + unitHash(i + 101) * MIRROR_DUST_REACH_SPREAD_TILES) * tilePx;
    return {
      dx: Math.cos(angle) * reach * eased,
      dy: Math.sin(angle) * reach * eased - MIRROR_DUST_RISE_TILES * tilePx * p,
      alpha: MIRROR_DUST_PEAK_ALPHA * (1 - p) ** MIRROR_DUST_FADE_POWER,
      size: tilePx * MIRROR_DUST_SIZE_TILES * (1 - p * 0.5),
    };
  });
}
