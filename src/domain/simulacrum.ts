import { GHOST_DIR, type GhostDir } from "./ghostPath";
import type { SolidGrid } from "./maze";
import { speedZoneAt, speedZoneEffect, type SpeedZone, type SpeedZoneEffect } from "./speedZones";

export const SIMULACRUM_ALPHA = 0.55;
export const SIMULACRUM_TINT = 0xb48cff;
export const SIMULACRUM_POP_MS = 700;
const SIMULACRUM_POP_BLINK_SHARE = 0.5;
const SIMULACRUM_POP_BLINK_STEP_MS = 60;
const SIMULACRUM_POP_BLINK_DIM_ALPHA = 0.15;
const SIMULACRUM_DUST_COUNT = 20;
const SIMULACRUM_DUST_MIN_REACH_TILES = 0.8;
const SIMULACRUM_DUST_REACH_SPREAD_TILES = 1.6;
const SIMULACRUM_DUST_SIZE_TILES = 0.28;
const SIMULACRUM_DUST_PEAK_ALPHA = 0.9;
const SIMULACRUM_DUST_FADE_POWER = 1.5;
const SIMULACRUM_DUST_RISE_TILES = 0.6;

export type Cell = { col: number; row: number };
export type BodyTile = Cell & { facing: GhostDir };

export function mirrorX(x: number, centerX: number): number {
  return 2 * centerX - x;
}

export function twinPoint(
  player: { x: number; y: number },
  layout: { offsetX: number; pixelWidth: number },
): { x: number; y: number } {
  return { x: mirrorX(player.x, layout.offsetX + layout.pixelWidth / 2), y: player.y };
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

export function twinDesynced(solids: SolidGrid, player: Cell): boolean {
  const cols = solids[0]?.length ?? 0;
  return (
    solidAt(solids, mirrorCol(player.col, cols), player.row) &&
    !solidAt(solids, player.col, player.row)
  );
}

export function twinZoneEffect(
  zones: readonly SpeedZone[],
  twin: Cell,
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

type Node = { index: number; g: number; f: number };

function pushHeap(heap: Node[], node: Node): void {
  heap.push(node);
  let at = heap.length - 1;
  while (at > 0) {
    const parent = (at - 1) >> 1;
    if (heap[parent]!.f <= heap[at]!.f) {
      break;
    }
    [heap[parent], heap[at]] = [heap[at]!, heap[parent]!];
    at = parent;
  }
}

function popHeap(heap: Node[]): Node {
  const top = heap[0]!;
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let at = 0;
    for (;;) {
      const left = at * 2 + 1;
      const right = left + 1;
      let smallest = at;
      if (left < heap.length && heap[left]!.f < heap[smallest]!.f) {
        smallest = left;
      }
      if (right < heap.length && heap[right]!.f < heap[smallest]!.f) {
        smallest = right;
      }
      if (smallest === at) {
        break;
      }
      [heap[smallest], heap[at]] = [heap[at]!, heap[smallest]!];
      at = smallest;
    }
  }
  return top;
}

export function pathLength(solids: SolidGrid, from: Cell, to: Cell): number {
  const rows = solids.length;
  const cols = solids[0]?.length ?? 0;
  if (solidAt(solids, to.col, to.row)) {
    return Number.POSITIVE_INFINITY;
  }
  const heuristic = (col: number, row: number): number => {
    const dCol = Math.abs(col - to.col);
    return Math.min(dCol, cols - dCol) + Math.abs(row - to.row);
  };
  const startIndex = from.row * cols + from.col;
  const goalIndex = to.row * cols + to.col;
  const best = new Map<number, number>([[startIndex, 0]]);
  const open: Node[] = [];
  pushHeap(open, { index: startIndex, g: 0, f: heuristic(from.col, from.row) });
  while (open.length > 0) {
    const { index, g } = popHeap(open);
    if (index === goalIndex) {
      return g;
    }
    if (g > (best.get(index) ?? Number.POSITIVE_INFINITY)) {
      continue;
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
      const nextG = g + 1;
      if (nextG < (best.get(nextIndex) ?? Number.POSITIVE_INFINITY)) {
        best.set(nextIndex, nextG);
        pushHeap(open, { index: nextIndex, g: nextG, f: nextG + heuristic(nextCol, nextRow) });
      }
    }
  }
  return Number.POSITIVE_INFINITY;
}

function straightLineSq(a: Cell, b: Cell): number {
  return (a.col - b.col) ** 2 + (a.row - b.row) ** 2;
}

export function nearestBody(
  ghost: Cell,
  player: BodyTile,
  twin: BodyTile | null,
  solids: SolidGrid,
): BodyTile {
  if (twin === null) {
    return player;
  }
  const viaPlayer = pathLength(solids, ghost, player);
  const viaTwin = pathLength(solids, ghost, twin);
  if (viaPlayer === viaTwin) {
    const reachable = Number.isFinite(viaPlayer);
    return !reachable && straightLineSq(ghost, twin) < straightLineSq(ghost, player)
      ? twin
      : player;
  }
  return viaTwin < viaPlayer ? twin : player;
}

export function simulacrumPopProgress(elapsedMs: number): number {
  return Math.min(1, Math.max(0, elapsedMs / SIMULACRUM_POP_MS));
}

function unitHash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function simulacrumPopLook(progress: number): { bodyAlpha: number; dustProgress: number } {
  const t = Math.min(1, Math.max(0, progress));
  if (t >= SIMULACRUM_POP_BLINK_SHARE) {
    return {
      bodyAlpha: 0,
      dustProgress: (t - SIMULACRUM_POP_BLINK_SHARE) / (1 - SIMULACRUM_POP_BLINK_SHARE),
    };
  }
  const step = Math.floor((t * SIMULACRUM_POP_MS) / SIMULACRUM_POP_BLINK_STEP_MS);
  return {
    bodyAlpha: step % 2 === 0 ? SIMULACRUM_ALPHA : SIMULACRUM_POP_BLINK_DIM_ALPHA,
    dustProgress: 0,
  };
}

export type SimulacrumDust = { dx: number; dy: number; alpha: number; size: number };

export function simulacrumDust(dustProgress: number, tilePx: number): SimulacrumDust[] {
  if (dustProgress <= 0) {
    return [];
  }
  const p = Math.min(1, dustProgress);
  const eased = 1 - (1 - p) ** 3;
  return Array.from({ length: SIMULACRUM_DUST_COUNT }, (_, i) => {
    const angle = unitHash(i) * Math.PI * 2;
    const reach =
      (SIMULACRUM_DUST_MIN_REACH_TILES + unitHash(i + 101) * SIMULACRUM_DUST_REACH_SPREAD_TILES) *
      tilePx;
    return {
      dx: Math.cos(angle) * reach * eased,
      dy: Math.sin(angle) * reach * eased - SIMULACRUM_DUST_RISE_TILES * tilePx * p,
      alpha: SIMULACRUM_DUST_PEAK_ALPHA * (1 - p) ** SIMULACRUM_DUST_FADE_POWER,
      size: tilePx * SIMULACRUM_DUST_SIZE_TILES * (1 - p * 0.5),
    };
  });
}
