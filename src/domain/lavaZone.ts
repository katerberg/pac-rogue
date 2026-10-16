import { cellOriginX, cellOriginY, TILE_SIZE, type MazeLayout, type MazeTile } from "./maze";

export const LAVA_DORMANT_MS = 5000;
export const LAVA_CRACK_WARN_MS = 1500;
export const LAVA_CRACK_BLINK_MS = 250;
export const LAVA_EMERGE_MS = 5000;
export const LAVA_HOLD_MS = 2000;
export const LAVA_RETRACT_MS = 5000;
export const LAVA_CYCLE_MS = LAVA_DORMANT_MS + LAVA_EMERGE_MS + LAVA_HOLD_MS + LAVA_RETRACT_MS;
export const LAVA_MAX_REACH_TILES = 1.5;
const LAVA_TOUCH_RADIUS_FRACTION = 0.6;

export type LavaPhase = "dormant" | "warn" | "emerging" | "full" | "retracting";

export type LavaCell = MazeTile & { distance: number; dx: number; dy: number };

export type LavaZone = { col: number; row: number; cells: LavaCell[] };

export type LavaRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
  front: boolean;
};

export type LavaRenderState = {
  zone: LavaZone;
  phase: LavaPhase;
  reachTiles: number;
  cracksFlashOn: boolean;
};

export type LavaZoneBoard = Pick<
  MazeLayout,
  "cols" | "rows" | "playerSolids" | "house" | "door" | "playerSpawn"
>;

const STEPS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
] as const;

export function isLavaZoneLevel(levelIndex: number): boolean {
  return levelIndex === 8;
}

function cycleTime(elapsedMs: number): number {
  return ((elapsedMs % LAVA_CYCLE_MS) + LAVA_CYCLE_MS) % LAVA_CYCLE_MS;
}

export function lavaPhase(elapsedMs: number): LavaPhase {
  const t = cycleTime(elapsedMs);
  if (t < LAVA_DORMANT_MS - LAVA_CRACK_WARN_MS) {
    return "dormant";
  }
  if (t < LAVA_DORMANT_MS) {
    return "warn";
  }
  if (t < LAVA_DORMANT_MS + LAVA_EMERGE_MS) {
    return "emerging";
  }
  return t < LAVA_DORMANT_MS + LAVA_EMERGE_MS + LAVA_HOLD_MS ? "full" : "retracting";
}

export function lavaReachTiles(elapsedMs: number): number {
  const t = cycleTime(elapsedMs) - LAVA_DORMANT_MS;
  if (t < 0) {
    return 0;
  }
  if (t < LAVA_EMERGE_MS) {
    return (LAVA_MAX_REACH_TILES * t) / LAVA_EMERGE_MS;
  }
  const retractT = t - LAVA_EMERGE_MS - LAVA_HOLD_MS;
  if (retractT < 0) {
    return LAVA_MAX_REACH_TILES;
  }
  return LAVA_MAX_REACH_TILES * (1 - retractT / LAVA_RETRACT_MS);
}

export function lavaCracksFlashOn(elapsedMs: number): boolean {
  return lavaPhase(elapsedMs) === "warn" && Math.floor(elapsedMs / LAVA_CRACK_BLINK_MS) % 2 === 0;
}

function walkable(board: LavaZoneBoard, col: number, row: number): boolean {
  return board.playerSolids[row]?.[col] === false;
}

function openSteps(board: LavaZoneBoard, col: number, row: number) {
  return STEPS.filter((s) => walkable(board, col + s.dx, row + s.dy));
}

function isIntersection(board: LavaZoneBoard, col: number, row: number): boolean {
  return openSteps(board, col, row).length >= 3;
}

function cellAllowed(board: LavaZoneBoard, tunnelRows: readonly number[], cell: MazeTile): boolean {
  const { col, row } = cell;
  return (
    col > 0 &&
    col < board.cols - 1 &&
    walkable(board, col, row) &&
    !tunnelRows.includes(row) &&
    board.house[row]?.[col] !== true &&
    board.door[row]?.[col] !== true &&
    !(col === board.playerSpawn.col && row === board.playerSpawn.row)
  );
}

function lavaCellsFrom(board: LavaZoneBoard, col: number, row: number): LavaCell[] {
  const maxDistance = Math.ceil(LAVA_MAX_REACH_TILES - 0.5);
  const cells: LavaCell[] = [{ col, row, distance: 0, dx: 0, dy: 0 }];
  for (let i = 0; i < cells.length; i += 1) {
    const from = cells[i]!;
    if (from.distance >= maxDistance) {
      continue;
    }
    for (const s of openSteps(board, from.col, from.row)) {
      const next = { col: from.col + s.dx, row: from.row + s.dy };
      if (!cells.some((c) => c.col === next.col && c.row === next.row)) {
        cells.push({ ...next, distance: from.distance + 1, dx: s.dx, dy: s.dy });
      }
    }
  }
  return cells;
}

function isStraightHallway(board: LavaZoneBoard, col: number, row: number): boolean {
  const open = openSteps(board, col, row);
  return open.length === 2 && open[0]!.dx === -open[1]!.dx && open[0]!.dy === -open[1]!.dy;
}

export function lavaZoneCandidates(
  board: LavaZoneBoard,
  tunnelRows: readonly number[],
): LavaZone[] {
  const zones: LavaZone[] = [];
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      if (!cellAllowed(board, tunnelRows, { col, row }) || !isStraightHallway(board, col, row)) {
        continue;
      }
      const cells = lavaCellsFrom(board, col, row);
      const clear = (cell: LavaCell) =>
        cellAllowed(board, tunnelRows, cell) && !isIntersection(board, cell.col, cell.row);
      if (cells.every(clear)) {
        zones.push({ col, row, cells });
      }
    }
  }
  return zones;
}

export function pickLavaZone(
  board: LavaZoneBoard,
  tunnelRows: readonly number[],
  nextRandom: () => number,
): LavaZone | null {
  const candidates = lavaZoneCandidates(board, tunnelRows);
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(nextRandom() * candidates.length)]!;
}

function spanRect(
  cell: MazeTile,
  step: { dx: number; dy: number },
  from: number,
  to: number,
  front: boolean,
): LavaRect {
  const x = cellOriginX(cell.col);
  const y = cellOriginY(cell.row);
  const lo = Math.min(from, to) * TILE_SIZE;
  const len = Math.abs(to - from) * TILE_SIZE;
  const { dx, dy } = step;
  return dx !== 0
    ? { x: x + lo, y, width: len, height: TILE_SIZE, dx, dy, front }
    : { x, y: y + lo, width: TILE_SIZE, height: len, dx, dy, front };
}

export function lavaRects(zone: LavaZone, reachTiles: number): LavaRect[] {
  const maxDistance = Math.max(...zone.cells.map((c) => c.distance));
  const rects: LavaRect[] = [];
  for (const cell of zone.cells) {
    if (cell.distance === 0) {
      const half = Math.min(reachTiles, 0.5);
      if (half > 0) {
        for (const s of zone.cells.filter((c) => c.distance === 1)) {
          rects.push(spanRect(cell, s, 0.5, 0.5 + (s.dx + s.dy) * half, half < 0.5));
        }
      }
      continue;
    }
    const fill = Math.min(1, reachTiles - (cell.distance - 0.5));
    if (fill <= 0) {
      continue;
    }
    const entry = cell.dx + cell.dy > 0 ? 0 : 1;
    const front = fill < 1 || cell.distance === maxDistance;
    rects.push(spanRect(cell, cell, entry, entry + (cell.dx + cell.dy) * fill, front));
  }
  return rects;
}

export function lavaTouchesCircle(
  rects: readonly LavaRect[],
  x: number,
  y: number,
  radius: number,
): boolean {
  const r = radius * LAVA_TOUCH_RADIUS_FRACTION;
  return rects.some((rect) => {
    const nx = Math.max(rect.x, Math.min(x, rect.x + rect.width));
    const ny = Math.max(rect.y, Math.min(y, rect.y + rect.height));
    return Math.hypot(x - nx, y - ny) < r;
  });
}
