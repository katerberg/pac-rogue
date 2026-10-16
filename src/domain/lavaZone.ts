import {
  cellOriginX,
  cellOriginY,
  TILE_SIZE,
  worldToCol,
  worldToRow,
  type MazeLayout,
  type MazeTile,
} from "./maze";

export const LAVA_DORMANT_MS = 7000;
export const LAVA_WARN_MS = 1500;
export const LAVA_FLASH_BLINK_MS = 250;
export const LAVA_EMERGE_MS = 3000;
export const LAVA_HOLD_MS = 4000;
export const LAVA_RETRACT_MS = 2000;
export const LAVA_CYCLE_MS = LAVA_DORMANT_MS + LAVA_EMERGE_MS + LAVA_HOLD_MS + LAVA_RETRACT_MS;
export const LAVA_MAX_REACH_TILES = 3.5;
const LAVA_TOUCH_RADIUS_FRACTION = 0.6;

export type LavaPhase = "dormant" | "warn" | "emerging" | "full" | "retracting";

type Step = { dx: number; dy: number };

export type LavaCell = MazeTile & { distance: number; dx: number; dy: number; turn: Step | null };

export type LavaZone = { col: number; row: number; cells: LavaCell[] };

export type LavaRenderState = {
  zone: LavaZone;
  phase: LavaPhase;
  reachTiles: number;
  flashOn: boolean;
};

export type LavaAvoid = { tunnelRows: readonly number[]; cells: readonly MazeTile[] };

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
  if (t < LAVA_DORMANT_MS - LAVA_WARN_MS) {
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

export function lavaFlashOn(elapsedMs: number): boolean {
  return lavaPhase(elapsedMs) === "warn" && Math.floor(elapsedMs / LAVA_FLASH_BLINK_MS) % 2 === 0;
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

function cellAllowed(board: LavaZoneBoard, avoid: LavaAvoid, cell: MazeTile): boolean {
  const { col, row } = cell;
  return (
    col > 0 &&
    col < board.cols - 1 &&
    walkable(board, col, row) &&
    !avoid.tunnelRows.includes(row) &&
    !avoid.cells.some((c) => c.col === col && c.row === row) &&
    board.house[row]?.[col] !== true &&
    board.door[row]?.[col] !== true &&
    !(col === board.playerSpawn.col && row === board.playerSpawn.row)
  );
}

function lavaCellsFrom(board: LavaZoneBoard, col: number, row: number): LavaCell[] {
  const maxDistance = Math.ceil(LAVA_MAX_REACH_TILES - 0.5);
  const cells: LavaCell[] = [{ col, row, distance: 0, dx: 0, dy: 0, turn: null }];
  for (let i = 0; i < cells.length; i += 1) {
    const from = cells[i]!;
    if (from.distance >= maxDistance) {
      continue;
    }
    for (const s of openSteps(board, from.col, from.row)) {
      const next = { col: from.col + s.dx, row: from.row + s.dy };
      if (!cells.some((c) => c.col === next.col && c.row === next.row)) {
        const turn =
          openSteps(board, next.col, next.row).find((t) => t.dx * s.dx + t.dy * s.dy === 0) ?? null;
        cells.push({ ...next, distance: from.distance + 1, dx: s.dx, dy: s.dy, turn });
      }
    }
  }
  return cells;
}

function isStraightHallway(board: LavaZoneBoard, col: number, row: number): boolean {
  const open = openSteps(board, col, row);
  return open.length === 2 && open[0]!.dx === -open[1]!.dx && open[0]!.dy === -open[1]!.dy;
}

export function lavaZoneCandidates(board: LavaZoneBoard, avoid: LavaAvoid): LavaZone[] {
  const zones: LavaZone[] = [];
  for (let row = 0; row < board.rows; row += 1) {
    for (let col = 0; col < board.cols; col += 1) {
      if (!cellAllowed(board, avoid, { col, row }) || !isStraightHallway(board, col, row)) {
        continue;
      }
      const cells = lavaCellsFrom(board, col, row);
      const clear = (cell: LavaCell) =>
        cellAllowed(board, avoid, cell) && !isIntersection(board, cell.col, cell.row);
      if (cells.every(clear)) {
        zones.push({ col, row, cells });
      }
    }
  }
  return zones;
}

export function pickLavaZone(
  board: LavaZoneBoard,
  avoid: LavaAvoid,
  nextRandom: () => number,
): LavaZone | null {
  const candidates = lavaZoneCandidates(board, avoid);
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(nextRandom() * candidates.length)]!;
}

function cellSignedDistance(
  cell: LavaCell,
  axis: Step,
  maxDistance: number,
  reachTiles: number,
  u: number,
  v: number,
): number {
  if (cell.distance === 0) {
    return reachTiles >= 0.5 ? Infinity : reachTiles - Math.abs((axis.dx !== 0 ? u : v) - 0.5);
  }
  const fill = Math.min(1, reachTiles - (cell.distance - 0.5));
  if (fill >= 1 && cell.distance < maxDistance) {
    return Infinity;
  }
  const { dx, dy, turn } = cell;
  if (turn === null || fill <= 0) {
    const depth = dx !== 0 ? (dx > 0 ? u : 1 - u) : dy > 0 ? v : 1 - v;
    return fill - depth;
  }
  const qx = u - (0.5 - dx / 2 + turn.dx / 2);
  const qy = v - (0.5 - dy / 2 + turn.dy / 2);
  const alongEntryEdge = -(qx * turn.dx + qy * turn.dy);
  const alongExitEdge = qx * dx + qy * dy;
  const swept = Math.atan2(alongExitEdge, alongEntryEdge);
  return Math.hypot(qx, qy) * Math.sin((fill * Math.PI) / 2 - swept);
}

export function lavaSignedDistancePx(
  zone: LavaZone,
  reachTiles: number,
  x: number,
  y: number,
): number | null {
  const col = worldToCol(x);
  const row = worldToRow(y);
  const cell = zone.cells.find((c) => c.col === col && c.row === row);
  if (cell === undefined) {
    return null;
  }
  const axis = zone.cells.find((c) => c.distance === 1) ?? { dx: 1, dy: 0 };
  const maxDistance = Math.max(...zone.cells.map((c) => c.distance));
  const u = (x - cellOriginX(col)) / TILE_SIZE;
  const v = (y - cellOriginY(row)) / TILE_SIZE;
  return cellSignedDistance(cell, axis, maxDistance, reachTiles, u, v) * TILE_SIZE;
}

export function lavaTouchesCircle(
  zone: LavaZone,
  reachTiles: number,
  x: number,
  y: number,
  radius: number,
): boolean {
  if (reachTiles <= 0) {
    return false;
  }
  const r = radius * LAVA_TOUCH_RADIUS_FRACTION;
  const atCentre = lavaSignedDistancePx(zone, reachTiles, x, y);
  if (atCentre !== null) {
    return atCentre > -r;
  }
  return Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4).some((angle) => {
    const d = lavaSignedDistancePx(
      zone,
      reachTiles,
      x + Math.cos(angle) * r,
      y + Math.sin(angle) * r,
    );
    return d !== null && d > 0;
  });
}
