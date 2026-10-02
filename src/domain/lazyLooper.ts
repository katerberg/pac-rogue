import type { MazeLayout, MazeTile } from "./maze";

export type LazyLooperRings = "outerInner" | "outer";

export const LAZY_LOOPER_OPTIONAL_TINT = 0x6e6e6e;

export function pelletTint(optional: boolean): number | null {
  return optional ? LAZY_LOOPER_OPTIONAL_TINT : null;
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
  outside: boolean[];
  house: boolean[];
};

function readGrid(layout: MazeLayout): Grid {
  const { cols, rows } = layout;
  const lines = layout.ascii.split("\n");
  const dot: boolean[] = [];
  const pellet: boolean[] = [];
  const open: boolean[] = [];
  const outside: boolean[] = [];
  const house: boolean[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const ch = lines[row]?.[col] ?? "";
      const walkable = !(layout.playerSolids[row]?.[col] ?? true);
      open.push(walkable);
      dot.push(walkable && ch === ".");
      pellet.push(walkable && (ch === "." || ch === "@"));
      outside.push(Boolean(layout.walls[row]?.[col] || layout.exterior[row]?.[col]));
      house.push(Boolean(layout.house[row]?.[col] || layout.door[row]?.[col]));
    }
  }
  return { cols, rows, dot, pellet, open, outside, house };
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

function outerRing(grid: Grid): Set<number> {
  const edgeSeeds = grid.outside.flatMap((outside, index) =>
    outside && neighbors(grid, index, ORTHOGONAL).includes(null) ? [index] : [],
  );
  const outerWalls = flood(grid, edgeSeeds, (index) => grid.outside[index]!);
  const tunnels = tunnelCells(grid);
  const ring = new Set<number>();
  grid.dot.forEach((isDot, index) => {
    if (
      isDot &&
      !tunnels.has(index) &&
      neighbors(grid, index, AROUND).some((n) => n === null || outerWalls.has(n))
    ) {
      ring.add(index);
    }
  });
  return ring;
}

function tunnelCells(grid: Grid): Set<number> {
  const blocked = (index: number | null): boolean => index === null || !grid.open[index];
  const cells = new Set<number>();
  for (let row = 0; row < grid.rows; row += 1) {
    const first = row * grid.cols;
    const last = first + grid.cols - 1;
    if (!grid.open[first] || !grid.open[last]) {
      continue;
    }
    for (const [start, step] of [
      [first, 1],
      [last, -1],
    ] as const) {
      for (let index = start; grid.open[index]; index += step) {
        const [up, down] = neighbors(grid, index, ORTHOGONAL);
        if (!blocked(up ?? null) || !blocked(down ?? null)) {
          break;
        }
        cells.add(index);
      }
    }
  }
  return cells;
}

function houseBand(grid: Grid): Set<number> {
  const houseSeeds = grid.house.flatMap((house, index) => (house ? [index] : []));
  return flood(
    grid,
    houseSeeds,
    (index) => grid.house[index]! || (grid.open[index]! && !grid.pellet[index]!),
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

function connectRing(grid: Grid, ring: Set<number>): Set<number> {
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
        if (next === null || !grid.open[next]) {
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

export function lazyLooperRequiredCells(layout: MazeLayout, rings: LazyLooperRings): MazeTile[] {
  const grid = readGrid(layout);
  const required = connectRing(grid, outerRing(grid));
  if (rings === "outerInner") {
    for (const index of innerRing(grid, houseBand(grid))) {
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
  return [...required].map((index) => ({
    col: index % grid.cols,
    row: Math.floor(index / grid.cols),
  }));
}
