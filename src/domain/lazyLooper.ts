import type { MazeLayout, MazeTile } from "./maze";
import { PELLET_DRAWABLE_ID } from "./playfield";

export type LazyLooperRings = "outerInner" | "outer";

export const LAZY_LOOPER_OPTIONAL_TINT = 0x6e6e6e;

/** Optional regular pellets go grey; a pellet converted to a power pellet keeps its own look. */
export function pelletTint(drawableId: string, optional: boolean): number | null {
  return drawableId === PELLET_DRAWABLE_ID && optional ? LAZY_LOOPER_OPTIONAL_TINT : null;
}

const ORTHOGONAL = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const;

const AROUND = [...ORTHOGONAL, [-1, -1], [1, -1], [-1, 1], [1, 1]] as const;

type Grid = {
  cols: number;
  rows: number;
  dot: boolean[];
  pellet: boolean[];
  open: boolean[];
};

function readGrid(layout: MazeLayout): Grid {
  const { cols, rows } = layout;
  const lines = layout.ascii.split("\n");
  const dot: boolean[] = [];
  const pellet: boolean[] = [];
  const open: boolean[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const ch = lines[row]?.[col] ?? "";
      const walkable = !(layout.playerSolids[row]?.[col] ?? true);
      open.push(walkable);
      dot.push(walkable && ch === ".");
      pellet.push(walkable && (ch === "." || ch === "@"));
    }
  }
  return { cols, rows, dot, pellet, open };
}

function neighbors(
  grid: Grid,
  index: number,
  offsets: readonly (readonly [number, number])[],
): (number | null)[] {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return offsets.map(([dc, dr]) => {
    const c = col + dc;
    const r = row + dr;
    return c < 0 || r < 0 || c >= grid.cols || r >= grid.rows ? null : r * grid.cols + c;
  });
}

function flood(grid: Grid, seeds: number[], passable: (index: number) => boolean): Set<number> {
  const seen = new Set(seeds);
  const queue = [...seeds];
  for (let head = 0; head < queue.length; head += 1) {
    for (const next of neighbors(grid, queue[head]!, ORTHOGONAL)) {
      if (next !== null && !seen.has(next) && passable(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function outerRing(layout: MazeLayout, grid: Grid): Set<number> {
  const solidOutside = (index: number): boolean => {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    return Boolean(layout.walls[row]?.[col] || layout.exterior[row]?.[col]);
  };
  const edgeSeeds: number[] = [];
  for (let index = 0; index < grid.open.length; index += 1) {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    const onEdge = col === 0 || row === 0 || col === grid.cols - 1 || row === grid.rows - 1;
    if (onEdge && solidOutside(index)) {
      edgeSeeds.push(index);
    }
  }
  const outerWalls = flood(grid, edgeSeeds, solidOutside);
  const ring = new Set<number>();
  grid.dot.forEach((isDot, index) => {
    if (isDot && neighbors(grid, index, AROUND).some((n) => n === null || outerWalls.has(n))) {
      ring.add(index);
    }
  });
  return ring;
}

function houseBand(layout: MazeLayout, grid: Grid): Set<number> {
  const isHouse = (index: number): boolean => {
    const col = index % grid.cols;
    const row = Math.floor(index / grid.cols);
    return Boolean(layout.house[row]?.[col] || layout.door[row]?.[col]);
  };
  const houseSeeds = grid.open.map((_, index) => index).filter(isHouse);
  return flood(
    grid,
    houseSeeds,
    (index) => isHouse(index) || (grid.open[index]! && !grid.pellet[index]!),
  );
}

function innerRing(grid: Grid, band: Set<number>): Set<number> {
  const ring = new Set<number>();
  for (const index of band) {
    for (const next of neighbors(grid, index, ORTHOGONAL)) {
      if (next !== null && grid.dot[next]) {
        ring.add(next);
      }
    }
  }
  return ring;
}

/**
 * Joins the ring's pieces into one: repeatedly links the nearest piece by the shortest walk
 * (never through `blocked`) and requires the dots on that walk.
 */
function connectRing(grid: Grid, ring: Set<number>, blocked: Set<number>): Set<number> {
  const joined = new Set(ring);
  const start = joined.values().next().value;
  if (start === undefined) {
    return joined;
  }
  for (;;) {
    const dist = new Array<number>(grid.open.length).fill(Infinity);
    const prev = new Array<number>(grid.open.length).fill(-1);
    dist[start] = 0;
    const deque = [start];
    while (deque.length > 0) {
      const current = deque.shift()!;
      for (const next of neighbors(grid, current, ORTHOGONAL)) {
        if (next === null || !grid.open[next] || blocked.has(next)) {
          continue;
        }
        const step = joined.has(next) ? 0 : 1;
        if (dist[current]! + step < dist[next]!) {
          dist[next] = dist[current]! + step;
          prev[next] = current;
          if (step === 0) {
            deque.unshift(next);
          } else {
            deque.push(next);
          }
        }
      }
    }
    let nearest = -1;
    for (const index of joined) {
      const d = dist[index]!;
      if (d > 0 && d < Infinity && (nearest === -1 || d < dist[nearest]!)) {
        nearest = index;
      }
    }
    if (nearest === -1) {
      return new Set([...joined].filter((index) => grid.dot[index]));
    }
    for (let at = prev[nearest]!; at !== -1; at = prev[at]!) {
      joined.add(at);
    }
  }
}

/** Dot cells Lazy Looper still requires on `layout`; every other dot is optional. */
export function lazyLooperRequiredCells(layout: MazeLayout, rings: LazyLooperRings): MazeTile[] {
  const grid = readGrid(layout);
  const required = connectRing(grid, outerRing(layout, grid), new Set());
  if (rings === "outerInner") {
    const band = houseBand(layout, grid);
    for (const index of connectRing(grid, innerRing(grid, band), band)) {
      required.add(index);
    }
  }
  for (const index of [...required]) {
    const col = index % grid.cols;
    const mirror = index - col + (grid.cols - 1 - col);
    if (grid.dot[mirror]) {
      required.add(mirror);
    }
  }
  return [...required]
    .sort((a, b) => a - b)
    .map((index) => ({ col: index % grid.cols, row: Math.floor(index / grid.cols) }));
}
