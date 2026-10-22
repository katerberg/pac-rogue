import type { MazeLayout, MazeTile } from "./maze";

const SPEED_ZONE_COUNT_BY_LEVEL: Readonly<Record<number, number>> = {
  4: 1,
  5: 1,
  6: 2,
  7: 3,
  8: 3,
};
export const SPEED_ZONE_MAX_COUNT = Math.max(...Object.values(SPEED_ZONE_COUNT_BY_LEVEL));
export const SPEED_ZONE_MIN_LENGTH = 9;
export const SPEED_ZONE_MAX_LENGTH = 18;
export const SPEED_ZONE_MIN_GAP_TILES = 4;
export const SLOW_ZONE_MULTIPLIER = 0.3;
export const FAST_ZONE_MULTIPLIER = 1.8;
export const SPEED_ZONE_END_DRIFT = [-2, -1, 0, 1, 1, 2] as const;
export const SPEED_ZONE_SHIFT_STEP_MS = 120;
const SPEED_ZONE_PARTICLES_PER_TILE = 2;
const SPEED_ZONE_PARTICLE_SPEED_SPREAD = 0.1;
const SPEED_ZONE_PARTICLE_SIDE_SPREAD_TILES = 0.6;
const SPEED_ZONE_PARTICLE_PEAK_ALPHA = 0.45;
const SPEED_ZONE_PARTICLE_FADE_SHARE = 0.12;

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

export function speedZoneCountForLevel(levelIndex: number): number {
  return SPEED_ZONE_COUNT_BY_LEVEL[levelIndex] ?? 0;
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

export type SpeedZoneParticle = { col: number; row: number; alpha: number; size: number };

export type SpeedZoneDustSpeeds = { entryTilesPerSec: number; exitTilesPerSec: number };

export const DEFAULT_SPEED_ZONE_DUST_SPEEDS: SpeedZoneDustSpeeds = {
  entryTilesPerSec: 0.2,
  exitTilesPerSec: 11,
};

function unitHash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function speedZoneParticles(
  zone: SpeedZone,
  nowMs: number,
  speeds: SpeedZoneDustSpeeds = DEFAULT_SPEED_ZONE_DUST_SPEEDS,
): SpeedZoneParticle[] {
  const { dx, dy } = speedZoneFastVector(zone);
  const startCol = dx < 0 ? zone.col + zone.length : zone.col + (dx === 0 ? 0.5 : 0);
  const startRow = dy < 0 ? zone.row + zone.length : zone.row + (dy === 0 ? 0.5 : 0);
  const seed = zone.col * 31 + zone.row * 17 + zone.length;
  const count = zone.length * SPEED_ZONE_PARTICLES_PER_TILE;
  const seconds = nowMs / 1000;
  return Array.from({ length: count }, (_, i) => {
    const key = seed * 101 + i;
    const scale = 1 + unitHash(key + 1) * SPEED_ZONE_PARTICLE_SPEED_SPREAD;
    const entry = speeds.entryTilesPerSec * scale;
    const exit = speeds.exitTilesPerSec * scale;
    const growth = (exit - entry) / zone.length;
    const flat = Math.abs(growth) < 1e-9;
    const crossingSec = flat ? zone.length / entry : Math.log(exit / entry) / growth;
    const t = (unitHash(key) * crossingSec + seconds) % crossingSec;
    const along = Math.min(
      zone.length,
      flat ? entry * t : (entry / growth) * Math.expm1(growth * t),
    );
    const progress = along / zone.length;
    const side = (unitHash(key + 2) - 0.5) * SPEED_ZONE_PARTICLE_SIDE_SPREAD_TILES;
    return {
      col: startCol + dx * along + dy * side,
      row: startRow + dy * along + dx * side,
      alpha:
        SPEED_ZONE_PARTICLE_PEAK_ALPHA *
        Math.min(
          1,
          progress / SPEED_ZONE_PARTICLE_FADE_SHARE,
          (1 - progress) / SPEED_ZONE_PARTICLE_FADE_SHARE,
        ),
      size: 0.5 + unitHash(key + 3),
    };
  });
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

function axisGap(aStart: number, aLength: number, bStart: number, bLength: number): number {
  return Math.max(0, bStart - (aStart + aLength - 1), aStart - (bStart + bLength - 1));
}

function tooClose(a: SpeedZoneShape, b: SpeedZoneShape): boolean {
  const colSpan = (z: SpeedZoneShape) => (z.axis === "horizontal" ? z.length : 1);
  const rowSpan = (z: SpeedZoneShape) => (z.axis === "vertical" ? z.length : 1);
  return (
    axisGap(a.col, colSpan(a), b.col, colSpan(b)) < SPEED_ZONE_MIN_GAP_TILES &&
    axisGap(a.row, rowSpan(a), b.row, rowSpan(b)) < SPEED_ZONE_MIN_GAP_TILES
  );
}

function laneAllowed(board: SpeedZoneBoard, lane: SpeedZoneShape): boolean {
  return speedZoneCells(lane).every((cell) => cellAllowed(board, cell.col, cell.row));
}

function laneCandidates(board: SpeedZoneBoard): SpeedZoneShape[] {
  const candidates: SpeedZoneShape[] = [];
  for (const axis of ["horizontal", "vertical"] as const) {
    const [dc, dr] = axis === "horizontal" ? [1, 0] : [0, 1];
    for (let row = 0; row < board.rows; row += 1) {
      for (let col = 0; col < board.cols; col += 1) {
        for (let length = 1; length <= SPEED_ZONE_MAX_LENGTH; length += 1) {
          if (!cellAllowed(board, col + dc * (length - 1), row + dr * (length - 1))) {
            break;
          }
          if (length >= SPEED_ZONE_MIN_LENGTH) {
            candidates.push({ col, row, axis, length });
          }
        }
      }
    }
  }
  return candidates;
}

export function pickSpeedZones(
  board: SpeedZoneBoard,
  nextRandom: () => number,
  count: number,
  existing: readonly SpeedZone[] = [],
  candidates: readonly SpeedZoneShape[] = laneCandidates(board),
): SpeedZone[] {
  const zones = [...existing];
  while (zones.length < count) {
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

type LaneSpan = { start: number; end: number };

function laneSpan(zone: SpeedZoneShape): LaneSpan {
  const start = zone.axis === "horizontal" ? zone.col : zone.row;
  return { start, end: start + zone.length };
}

function withSpan<Z extends SpeedZoneShape>(zone: Z, { start, end }: LaneSpan): Z {
  return zone.axis === "horizontal"
    ? { ...zone, col: start, length: end - start }
    : { ...zone, row: start, length: end - start };
}

function driftEnd(
  board: SpeedZoneBoard,
  zone: SpeedZone,
  others: readonly SpeedZone[],
  end: keyof LaneSpan,
  drift: number,
): SpeedZone {
  let current = zone;
  const outward = end === "start" ? -1 : 1;
  for (let i = 0; i < Math.abs(drift); i += 1) {
    const span = laneSpan(current);
    const next = withSpan(current, { ...span, [end]: span[end] + Math.sign(drift) * outward });
    const fits =
      next.length >= SPEED_ZONE_MIN_LENGTH &&
      next.length <= SPEED_ZONE_MAX_LENGTH &&
      laneAllowed(board, next) &&
      others.every((other) => !tooClose(other, next));
    if (!fits) {
      break;
    }
    current = next;
  }
  return current;
}

function pickDrift(nextRandom: () => number): number {
  return SPEED_ZONE_END_DRIFT[Math.floor(nextRandom() * SPEED_ZONE_END_DRIFT.length)]!;
}

export function driftSpeedZones(
  board: SpeedZoneBoard,
  zones: readonly SpeedZone[],
  nextRandom: () => number,
): SpeedZone[] {
  const drifted = [...zones];
  drifted.forEach((zone, i) => {
    const others = drifted.filter((_, j) => j !== i);
    const startMoved = driftEnd(board, zone, others, "start", pickDrift(nextRandom));
    drifted[i] = driftEnd(board, startMoved, others, "end", pickDrift(nextRandom));
  });
  return drifted;
}

export function speedZonesByLevel(
  board: SpeedZoneBoard,
  throughLevel: number,
  streamFor: (levelIndex: number) => () => number,
): SpeedZone[][] {
  const candidates = laneCandidates(board);
  const byLevel: SpeedZone[][] = [[]];
  for (let level = 1; level <= throughLevel; level += 1) {
    const count = speedZoneCountForLevel(level);
    const previous = byLevel[level - 1]!;
    if (count === 0) {
      byLevel.push([]);
      continue;
    }
    const nextRandom = streamFor(level);
    const drifted = driftSpeedZones(board, previous, nextRandom);
    byLevel.push(pickSpeedZones(board, nextRandom, count, drifted, candidates));
  }
  return byLevel;
}

export type SpeedZoneShift = { from: readonly SpeedZone[]; to: readonly SpeedZone[] };

export function speedZoneShift(
  previous: readonly SpeedZone[],
  next: readonly SpeedZone[],
): SpeedZoneShift {
  const from = next.map((zone, i) => {
    const before = previous[i];
    if (before !== undefined) {
      return before;
    }
    const { start, end } = laneSpan(zone);
    const middle = Math.floor((start + end) / 2);
    return withSpan(zone, { start: middle, end: middle });
  });
  return { from, to: next };
}

function stepToward(from: number, to: number, steps: number): number {
  return from + Math.sign(to - from) * Math.min(Math.abs(to - from), steps);
}

export function speedZoneShiftSteps({ from, to }: SpeedZoneShift): number {
  return Math.max(
    0,
    ...to.map((zone, i) => {
      const a = laneSpan(from[i]!);
      const b = laneSpan(zone);
      return Math.max(Math.abs(b.start - a.start), Math.abs(b.end - a.end));
    }),
  );
}

export function speedZoneShiftFrame({ from, to }: SpeedZoneShift, step: number): SpeedZone[] {
  return to
    .map((zone, i) => {
      const a = laneSpan(from[i]!);
      const b = laneSpan(zone);
      return withSpan(zone, {
        start: stepToward(a.start, b.start, step),
        end: stepToward(a.end, b.end, step),
      });
    })
    .filter((zone) => zone.length > 0);
}
