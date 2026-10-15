import type { MazeLayout, MazeTile, SolidGrid } from "./maze";

export const SPEED_ZONE_SIZE = 4;
export const SPEED_ZONE_MIN_WALKABLE = 6;
export const SLOW_ZONE_MULTIPLIER = 0.6;
export const FAST_ZONE_MULTIPLIER = 1.5;

export type SpeedZoneKind = "slow" | "fast";

export type SpeedZone = { kind: SpeedZoneKind; col: number; row: number; size: number };

export type SpeedZoneBoard = Pick<
  MazeLayout,
  "cols" | "rows" | "playerSolids" | "house" | "door" | "playerSpawn"
>;

export function isSpeedZoneLevel(levelIndex: number): boolean {
  return levelIndex >= 5 && levelIndex <= 8;
}

export function speedZoneAt(
  zones: readonly SpeedZone[],
  col: number,
  row: number,
): SpeedZoneKind | null {
  const zone = zones.find(
    (z) => col >= z.col && col < z.col + z.size && row >= z.row && row < z.row + z.size,
  );
  return zone?.kind ?? null;
}

export function speedZoneHallwayCells(zone: SpeedZone, playerSolids: SolidGrid): MazeTile[] {
  const cells: MazeTile[] = [];
  for (let row = zone.row; row < zone.row + zone.size; row += 1) {
    for (let col = zone.col; col < zone.col + zone.size; col += 1) {
      if (playerSolids[row]?.[col] === false) {
        cells.push({ col, row });
      }
    }
  }
  return cells;
}

export type SpeedZoneGlowMask = { width: number; height: number; alpha: Float32Array };

export type SpeedZoneGlowStyle = {
  tileSize: number;
  reachPx: number;
  fillAlpha: number;
  glowPeakAlpha: number;
};

export function speedZoneGlowMask(
  zone: SpeedZone,
  cells: readonly MazeTile[],
  style: SpeedZoneGlowStyle,
): SpeedZoneGlowMask {
  const { tileSize, reachPx, fillAlpha, glowPeakAlpha } = style;
  const width = zone.size * tileSize + reachPx * 2;
  const height = width;
  const rects = cells.map((cell) => ({
    x0: reachPx + (cell.col - zone.col) * tileSize,
    y0: reachPx + (cell.row - zone.row) * tileSize,
  }));
  const alpha = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      let nearest = Infinity;
      for (const { x0, y0 } of rects) {
        const dx = Math.max(x0 - px, 0, px - (x0 + tileSize));
        const dy = Math.max(y0 - py, 0, py - (y0 + tileSize));
        nearest = Math.min(nearest, Math.hypot(dx, dy));
      }
      const falloff = 1 - nearest / reachPx;
      alpha[y * width + x] =
        nearest === 0 ? fillAlpha : falloff > 0 ? glowPeakAlpha * falloff * falloff : 0;
    }
  }
  return { width, height, alpha };
}

export function speedZoneMultiplier(kind: SpeedZoneKind | null): number {
  if (kind === "slow") {
    return SLOW_ZONE_MULTIPLIER;
  }
  return kind === "fast" ? FAST_ZONE_MULTIPLIER : 1;
}

function zoneFits(board: SpeedZoneBoard, col: number, row: number): boolean {
  let walkable = 0;
  for (let r = row; r < row + SPEED_ZONE_SIZE; r += 1) {
    for (let c = col; c < col + SPEED_ZONE_SIZE; c += 1) {
      if (board.house[r]?.[c] === true || board.door[r]?.[c] === true) {
        return false;
      }
      if (c === board.playerSpawn.col && r === board.playerSpawn.row) {
        return false;
      }
      if (board.playerSolids[r]?.[c] === false) {
        walkable += 1;
      }
    }
  }
  return walkable >= SPEED_ZONE_MIN_WALKABLE;
}

function overlaps(a: SpeedZone, col: number, row: number): boolean {
  return (
    col < a.col + a.size &&
    col + SPEED_ZONE_SIZE > a.col &&
    row < a.row + a.size &&
    row + SPEED_ZONE_SIZE > a.row
  );
}

export function pickSpeedZones(board: SpeedZoneBoard, nextRandom: () => number): SpeedZone[] {
  const candidates: MazeTile[] = [];
  for (let row = 0; row + SPEED_ZONE_SIZE <= board.rows; row += 1) {
    for (let col = 0; col + SPEED_ZONE_SIZE <= board.cols; col += 1) {
      if (zoneFits(board, col, row)) {
        candidates.push({ col, row });
      }
    }
  }
  const zones: SpeedZone[] = [];
  for (const kind of ["slow", "fast"] as const) {
    const open = candidates.filter((c) => !zones.some((z) => overlaps(z, c.col, c.row)));
    if (open.length === 0) {
      break;
    }
    const pick = open[Math.floor(nextRandom() * open.length)]!;
    zones.push({ kind, col: pick.col, row: pick.row, size: SPEED_ZONE_SIZE });
  }
  return zones;
}
