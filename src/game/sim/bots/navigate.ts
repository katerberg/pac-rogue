import type { SolidGrid } from "../../../domain/maze";
import { DIRECTION, type Direction } from "../../components/Input";

export type CardinalDirection =
  typeof DIRECTION.up | typeof DIRECTION.down | typeof DIRECTION.left | typeof DIRECTION.right;

export const CARDINALS: readonly CardinalDirection[] = [
  DIRECTION.up,
  DIRECTION.down,
  DIRECTION.left,
  DIRECTION.right,
];

const STEP: Record<CardinalDirection, { dx: number; dy: number }> = {
  [DIRECTION.up]: { dx: 0, dy: -1 },
  [DIRECTION.down]: { dx: 0, dy: 1 },
  [DIRECTION.left]: { dx: -1, dy: 0 },
  [DIRECTION.right]: { dx: 1, dy: 0 },
};

export function reverseOf(direction: Direction): Direction {
  switch (direction) {
    case DIRECTION.up:
      return DIRECTION.down;
    case DIRECTION.down:
      return DIRECTION.up;
    case DIRECTION.left:
      return DIRECTION.right;
    case DIRECTION.right:
      return DIRECTION.left;
    default:
      return DIRECTION.none;
  }
}

export type Grid = { cols: number; rows: number; open: Uint8Array };

export function gridFrom(solids: SolidGrid): Grid {
  const rows = solids.length;
  const cols = solids[0]?.length ?? 0;
  const open = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      open[row * cols + col] = solids[row]![col] ? 0 : 1;
    }
  }
  return { cols, rows, open };
}

export function cellIndex(grid: Grid, col: number, row: number): number {
  return row * grid.cols + col;
}

export function neighbor(grid: Grid, index: number, direction: CardinalDirection): number {
  const { dx, dy } = STEP[direction];
  const col = ((((index % grid.cols) + dx) % grid.cols) + grid.cols) % grid.cols;
  const row = (((Math.floor(index / grid.cols) + dy) % grid.rows) + grid.rows) % grid.rows;
  const next = row * grid.cols + col;
  return grid.open[next] === 1 ? next : -1;
}

export function openExits(grid: Grid, index: number): CardinalDirection[] {
  return CARDINALS.filter((direction) => neighbor(grid, index, direction) !== -1);
}

export function bfs(grid: Grid, from: number, blocked = -1): Int32Array {
  const dist = new Int32Array(grid.open.length).fill(-1);
  const queue = new Int32Array(grid.open.length);
  dist[from] = 0;
  queue[0] = from;
  let head = 0;
  let tail = 1;
  while (head < tail) {
    const at = queue[head]!;
    head += 1;
    for (const direction of CARDINALS) {
      const next = neighbor(grid, at, direction);
      if (next !== -1 && next !== blocked && dist[next] === -1) {
        dist[next] = dist[at]! + 1;
        queue[tail] = next;
        tail += 1;
      }
    }
  }
  return dist;
}

export type ExitScore = { direction: CardinalDirection; score: number };

export function bestExit(scores: readonly ExitScore[]): CardinalDirection | null {
  let best: ExitScore | null = null;
  for (const entry of scores) {
    if (best === null || entry.score > best.score) {
      best = entry;
    }
  }
  return best?.direction ?? null;
}
