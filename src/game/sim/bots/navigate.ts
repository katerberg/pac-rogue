import type { SolidGrid } from "../../../domain/maze";
import { DIRECTION, type Direction } from "../../components/Input";
import type { MoveWeights } from "./profiles";

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

export type GhostView = {
  cell: number;
  behind: number;
  speedRatio: number;
  dangerous: boolean;
  frightened: boolean;
};

export type BoardView = {
  grid: Grid;
  pellets: readonly number[];
  powerPellets: readonly number[];
  fruit: number | null;
  tunnelCells: readonly number[];
  ghosts: readonly GhostView[];
  invulnerable: boolean;
};

const TERRITORY_DEPTH = 30;
const TERRITORY_FULL = 120;
const REVERSE_PENALTY = 0.25;

function nearest(dist: Int32Array, cells: readonly number[]): number | null {
  let best: number | null = null;
  for (const cell of cells) {
    const d = dist[cell]!;
    if (d >= 0 && (best === null || d < best)) {
      best = d;
    }
  }
  return best;
}

function closeness(d: number | null): number {
  return d === null ? 0 : 1 / (1 + d);
}

function ghostArrival(grid: Grid, ghost: GhostView): Float64Array {
  const dist = bfs(grid, ghost.cell, ghost.behind);
  const speed = Math.max(0.05, ghost.speedRatio);
  const arrival = new Float64Array(dist.length);
  for (let cell = 0; cell < dist.length; cell += 1) {
    const d = dist[cell]!;
    arrival[cell] = d < 0 ? Number.POSITIVE_INFINITY : d / speed;
  }
  return arrival;
}

function earliest(grid: Grid, arrivals: readonly Float64Array[]): Float64Array {
  const first = new Float64Array(grid.open.length).fill(Number.POSITIVE_INFINITY);
  for (const arrival of arrivals) {
    for (let cell = 0; cell < first.length; cell += 1) {
      first[cell] = Math.min(first[cell]!, arrival[cell]!);
    }
  }
  return first;
}

function territory(
  grid: Grid,
  start: number,
  blocked: number,
  arrival: Float64Array,
  margin: number,
): number {
  if (!(1 < arrival[start]! - margin)) {
    return 0;
  }
  const dist = new Int32Array(grid.open.length).fill(-1);
  const queue = new Int32Array(grid.open.length);
  dist[start] = 0;
  queue[0] = start;
  let head = 0;
  let tail = 1;
  while (head < tail) {
    const at = queue[head]!;
    head += 1;
    if (dist[at]! >= TERRITORY_DEPTH) {
      continue;
    }
    for (const direction of CARDINALS) {
      const next = neighbor(grid, at, direction);
      const steps = dist[at]! + 1;
      if (
        next !== -1 &&
        next !== blocked &&
        dist[next] === -1 &&
        steps + 1 < arrival[next]! - margin
      ) {
        dist[next] = steps;
        queue[tail] = next;
        tail += 1;
      }
    }
  }
  return tail;
}

export type ExitScore = { direction: CardinalDirection; score: number };

export function scoreExits(
  view: BoardView,
  currentCell: number,
  decisionCell: number,
  facing: Direction,
  weights: MoveWeights,
  gaussian: () => number,
): ExitScore[] {
  const grid = view.grid;
  const exits = openExits(grid, decisionCell);
  const threats = view.invulnerable ? [] : view.ghosts.filter((ghost) => ghost.dangerous);
  const perGhost = threats.map((ghost) => ghostArrival(grid, ghost));
  const arrival = earliest(grid, perGhost);
  const margin = weights.fearRadiusTiles / 4;
  const threat = Math.max(0, 1 - arrival[decisionCell]! / (2 * weights.fearRadiusTiles));
  const nearThreats = perGhost.map((ghostSteps) => ghostSteps[decisionCell]!);
  const ghostsNear =
    nearThreats.filter((d) => d <= 6).length >= 2 || nearThreats.some((d) => d <= 3);
  const frightCells = view.ghosts.filter((ghost) => ghost.frightened).map((ghost) => ghost.cell);
  const pelletSet = new Set(view.pellets);

  return exits.map((direction) => {
    const reversing = direction === reverseOf(facing);
    const next =
      reversing && currentCell !== decisionCell
        ? currentCell
        : neighbor(grid, decisionCell, direction);
    const mine = bfs(grid, next, decisionCell);
    let danger = 0;
    for (const ghostSteps of perGhost) {
      const steps = ghostSteps[next]!;
      danger += Math.max(0, weights.fearRadiusTiles - steps) ** 2 / weights.fearRadiusTiles ** 2;
    }
    const room =
      threats.length === 0
        ? 1
        : Math.min(1, territory(grid, next, decisionCell, arrival, margin) / TERRITORY_FULL);
    const safety = -danger - (1 - room) * threat;
    const powerWeight = weights.powerHoldNearGhosts
      ? ghostsNear
        ? weights.powerSeek * 3
        : -weights.powerSeek * 0.5
      : weights.powerSeek * (1 + 3 * threat);
    let score =
      weights.ghostFear * safety +
      weights.pellet * closeness(nearest(mine, view.pellets)) +
      (pelletSet.has(next) ? weights.streak : 0) +
      powerWeight * closeness(nearest(mine, view.powerPellets)) +
      (frightCells.length > 0 ? weights.frightChase * closeness(nearest(mine, frightCells)) : 0) +
      (view.fruit === null ? 0 : weights.fruit * closeness(nearest(mine, [view.fruit]))) +
      weights.tunnel * threat * closeness(nearest(mine, view.tunnelCells)) +
      weights.noise * gaussian();
    if (reversing && exits.length > 1) {
      score -= REVERSE_PENALTY;
    }
    return { direction, score };
  });
}

export function bestExit(scores: readonly ExitScore[]): CardinalDirection | null {
  let best: ExitScore | null = null;
  for (const entry of scores) {
    if (best === null || entry.score > best.score) {
      best = entry;
    }
  }
  return best?.direction ?? null;
}
