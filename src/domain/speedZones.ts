import type { MazeLayout, MazeTile } from "./maze";

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
