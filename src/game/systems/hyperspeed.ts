import { query, type World } from "bitecs";
import { getActiveLayout } from "../../domain/maze";
import { DIRECTION, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Speed } from "../components/Speed";
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

export type HyperspeedSubsteps = {
  moveFrame: (frameDelta: number) => void;
  afterStep: () => void;
  collect: () => boolean;
  halt: () => void;
};

export function runHyperspeedSubsteps(
  world: World,
  delta: number,
  hooks: HyperspeedSubsteps,
): void {
  const speed = Speed.px[query(world, [Player, Speed])[0] ?? 0] ?? 0;
  const steps = hyperspeedSubstepCount((speed * delta) / 1000, getActiveLayout().tileSize);
  const stepDelta = delta / steps;
  let caught = false;
  for (let step = 0; step < steps; step += 1) {
    hooks.moveFrame(stepDelta);
    hooks.afterStep();
    if (caught) {
      continue;
    }
    if (hooks.collect()) {
      caught = true;
      hooks.halt();
    }
  }
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
    removedCells: [...a.removedCells, ...b.removedCells],
  };
}
