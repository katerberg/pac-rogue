import { DIRECTION, type Direction } from "../components/Input";
import type { PlayerPelletFrame } from "./collectPellets";

export const HYPERSPEED_STEP_TILE_FRACTION = 0.25;
export const HYPERSPEED_MAX_SUBSTEPS = 64;

export function hyperspeedSubstepCount(travelPx: number, tilePx: number): number {
  if (!(travelPx > 0) || !(tilePx > 0)) {
    return 1;
  }
  const steps = Math.ceil(travelPx / (tilePx * HYPERSPEED_STEP_TILE_FRACTION));
  return Math.min(HYPERSPEED_MAX_SUBSTEPS, Math.max(1, steps));
}

export type HyperspeedTurn = { lastDirection: Direction | null; turned: boolean };

export function noteHyperspeedFacing(
  lastDirection: Direction | null,
  facing: Direction,
  delayActive: boolean,
): HyperspeedTurn {
  if (facing === DIRECTION.none) {
    return { lastDirection, turned: false };
  }
  if (lastDirection === null || delayActive) {
    return { lastDirection: facing, turned: false };
  }
  return { lastDirection: facing, turned: facing !== lastDirection };
}

export function emptyPlayerPelletFrame(): PlayerPelletFrame {
  return {
    powerRemoved: 0,
    removedEids: [],
    removedPowerPositions: [],
    removedSnaps: [],
    removedCells: [],
  };
}

export function mergePlayerPelletFrames(
  a: PlayerPelletFrame,
  b: PlayerPelletFrame,
): PlayerPelletFrame {
  return {
    powerRemoved: a.powerRemoved + b.powerRemoved,
    removedEids: [...a.removedEids, ...b.removedEids],
    removedPowerPositions: [...a.removedPowerPositions, ...b.removedPowerPositions],
    removedSnaps: [...a.removedSnaps, ...b.removedSnaps],
    removedCells: [...a.removedCells, ...b.removedCells],
  };
}
