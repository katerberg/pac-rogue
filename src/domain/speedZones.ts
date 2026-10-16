import type { MazeLayout, MazeTile } from "./maze";

export const SPEED_ZONE_COUNT = 2;
export const SPEED_ZONE_MIN_LENGTH = 3;
export const SPEED_ZONE_MAX_LENGTH = 6;
export const SPEED_ZONE_MIN_GAP_TILES = 4;
export const SLOW_ZONE_MULTIPLIER = 0.6;
export const FAST_ZONE_MULTIPLIER = 1.5;
const SPEED_ZONE_PULSE_SPACING_TILES = 1.25;
const SPEED_ZONE_PULSE_TILES_PER_SEC = 2.5;

export type SpeedZoneAxis = "horizontal" | "vertical";
export type SpeedZoneFastDir = "up" | "down" | "left" | "right";
export type SpeedZoneEffect = "slow" | "fast";

export type SpeedZone = {
  col: number;
  row: number;
  axis: SpeedZoneAxis;
  length: number;
  fastDir: SpeedZoneFastDir;
};

type SpeedZoneShape = Omit<SpeedZone, "fastDir">;

export type SpeedZoneBoard = Pick<
  MazeLayout,
  "cols" | "rows" | "playerSolids" | "house" | "door" | "playerSpawn"
>;

export function isSpeedZoneLevel(levelIndex: number): boolean {
  return levelIndex >= 5 && levelIndex <= 8;
}

export function speedZoneCells(zone: SpeedZoneShape): MazeTile[] {
  return Array.from({ length: zone.length }, (_, i) =>
    zone.axis === "horizontal"
      ? { col: zone.col + i, row: zone.row }
      : { col: zone.col, row: zone.row + i },
  );
}

export function speedZoneAt(
  zones: readonly SpeedZone[],
  col: number,
  row: number,
): SpeedZone | null {
  return (
    zones.find((zone) =>
      speedZoneCells(zone).some((cell) => cell.col === col && cell.row === row),
    ) ?? null
  );
}

export function speedZoneEffect(zone: SpeedZone, dx: number, dy: number): SpeedZoneEffect | null {
  const fast = speedZoneFastVector(zone);
  const along = Math.sign(zone.axis === "horizontal" ? dx : dy);
  if (along === 0) {
    return null;
  }
  return along === (zone.axis === "horizontal" ? fast.dx : fast.dy) ? "fast" : "slow";
}

export function speedZoneMultiplier(effect: SpeedZoneEffect | null): number {
  if (effect === "slow") {
    return SLOW_ZONE_MULTIPLIER;
  }
  return effect === "fast" ? FAST_ZONE_MULTIPLIER : 1;
}

export function speedZoneFastVector(zone: SpeedZone): { dx: number; dy: number } {
  switch (zone.fastDir) {
    case "up":
      return { dx: 0, dy: -1 };
    case "down":
      return { dx: 0, dy: 1 };
    case "left":
      return { dx: -1, dy: 0 };
    default:
      return { dx: 1, dy: 0 };
  }
}

export function speedZonePulsePoints(
  zone: SpeedZone,
  nowMs: number,
): { col: number; row: number; alpha: number }[] {
  const { dx, dy } = speedZoneFastVector(zone);
  const startCol = dx < 0 ? zone.col + zone.length : zone.col + (dx === 0 ? 0.5 : 0);
  const startRow = dy < 0 ? zone.row + zone.length : zone.row + (dy === 0 ? 0.5 : 0);
  const travel = (nowMs / 1000) * SPEED_ZONE_PULSE_TILES_PER_SEC;
  const points: { col: number; row: number; alpha: number }[] = [];
  for (
    let at = travel % SPEED_ZONE_PULSE_SPACING_TILES;
    at < zone.length;
    at += SPEED_ZONE_PULSE_SPACING_TILES
  ) {
    points.push({
      col: startCol + dx * at,
      row: startRow + dy * at,
      alpha: Math.sin((Math.PI * at) / zone.length),
    });
  }
  return points;
}

export type SpeedZoneGlowMask = { width: number; height: number; alpha: Float32Array };

export type SpeedZoneGlowStyle = {
  tileSize: number;
  reachPx: number;
  fillAlpha: number;
  glowPeakAlpha: number;
};

export function speedZoneGlowMask(zone: SpeedZone, style: SpeedZoneGlowStyle): SpeedZoneGlowMask {
  const { tileSize, reachPx, fillAlpha, glowPeakAlpha } = style;
  const horizontal = zone.axis === "horizontal";
  const laneW = (horizontal ? zone.length : 1) * tileSize;
  const laneH = (horizontal ? 1 : zone.length) * tileSize;
  const width = laneW + reachPx * 2;
  const height = laneH + reachPx * 2;
  const radius = tileSize / 2;
  const halfW = laneW / 2 - radius;
  const halfH = laneH / 2 - radius;
  const alpha = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const qx = Math.abs(x + 0.5 - width / 2) - halfW;
      const qy = Math.abs(y + 0.5 - height / 2) - halfH;
      const distance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius;
      const falloff = 1 - distance / reachPx;
      alpha[y * width + x] =
        distance <= 0 ? fillAlpha : falloff > 0 ? glowPeakAlpha * falloff * falloff : 0;
    }
  }
  return { width, height, alpha };
}

function cellAllowed(board: SpeedZoneBoard, col: number, row: number): boolean {
  return (
    col > 0 &&
    col < board.cols - 1 &&
    board.playerSolids[row]?.[col] === false &&
    board.house[row]?.[col] !== true &&
    board.door[row]?.[col] !== true &&
    !(col === board.playerSpawn.col && row === board.playerSpawn.row)
  );
}

function tooClose(a: SpeedZoneShape, b: SpeedZoneShape): boolean {
  const bCells = speedZoneCells(b);
  return speedZoneCells(a).some((ca) =>
    bCells.some(
      (cb) =>
        Math.abs(ca.col - cb.col) < SPEED_ZONE_MIN_GAP_TILES &&
        Math.abs(ca.row - cb.row) < SPEED_ZONE_MIN_GAP_TILES,
    ),
  );
}

export function pickSpeedZones(board: SpeedZoneBoard, nextRandom: () => number): SpeedZone[] {
  const candidates: SpeedZoneShape[] = [];
  for (const axis of ["horizontal", "vertical"] as const) {
    for (let row = 0; row < board.rows; row += 1) {
      for (let col = 0; col < board.cols; col += 1) {
        for (let length = SPEED_ZONE_MIN_LENGTH; length <= SPEED_ZONE_MAX_LENGTH; length += 1) {
          const lane = { col, row, axis, length };
          if (speedZoneCells(lane).every((cell) => cellAllowed(board, cell.col, cell.row))) {
            candidates.push(lane);
          }
        }
      }
    }
  }
  const zones: SpeedZone[] = [];
  while (zones.length < SPEED_ZONE_COUNT) {
    const open = candidates.filter((c) => zones.every((zone) => !tooClose(zone, c)));
    if (open.length === 0) {
      break;
    }
    const pick = open[Math.floor(nextRandom() * open.length)]!;
    const forward = nextRandom() < 0.5;
    const fastDir: SpeedZoneFastDir =
      pick.axis === "horizontal" ? (forward ? "right" : "left") : forward ? "down" : "up";
    zones.push({ ...pick, fastDir });
  }
  return zones;
}
