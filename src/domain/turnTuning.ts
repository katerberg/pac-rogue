import {
  TILE_SIZE,
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  worldToCol,
  worldToRow,
  type SolidGrid,
} from "./maze";
import { playerPreTurnPx } from "./playfield";

export const TURN_TUNING_BOOST_MS = 500;
export const TURN_TUNING_BOOST_MUL = 1.25;
/** Two tiles of the active layout — read via getter so per-layout tile sizes apply. */
export function turnTuningWindowPx(tileSize: number = TILE_SIZE): number {
  return tileSize * 2;
}
export const TURN_TUNING_PERFECT_PX = 8;
export const TURN_TUNING_CLOSE_PX = 20;
export const TURN_TUNING_SPAM_MS = 300;
const CLOSE_SPARKS_MAX = 5;
const CLOSE_SPARKS_MIN = 3;

export const TURN_FLASH_MS = 300;
export const TURN_FLASH_SCALE = 0.3;
export const TURN_FLASH_ALPHA_DROP = 0.1;
export const TURN_FLASH_BRIGHTEN = 0.2;
const TURN_FLASH_ATTACK = 0.2;

export type CardinalStep = { dx: number; dy: number };

export function turnTapAheadPx(
  x: number,
  y: number,
  facing: CardinalStep,
  turn: CardinalStep,
  solids: SolidGrid,
): number | null {
  const col = worldToCol(x);
  const row = worldToRow(y);
  const pastCenter =
    facing.dx !== 0 ? (x - cellCenterX(col)) * facing.dx : (y - cellCenterY(row)) * facing.dy;
  const open = (c: number, r: number, step: CardinalStep) =>
    canEnterDirection(cellCenterX(c), cellCenterY(r), step.dx, step.dy, solids);
  const windowPx = turnTuningWindowPx();
  for (let k = 0; ; k += 1) {
    const ahead = k * TILE_SIZE - pastCenter;
    if (ahead > windowPx) {
      return null;
    }
    if (k > 0 && !open(col + (k - 1) * facing.dx, row + (k - 1) * facing.dy, facing)) {
      return null;
    }
    if (ahead >= -playerPreTurnPx() && open(col + k * facing.dx, row + k * facing.dy, turn)) {
      return ahead;
    }
  }
}

export function isCleanTap(lastPressMs: number | undefined, nowMs: number): boolean {
  return lastPressMs === undefined || nowMs - lastPressMs >= TURN_TUNING_SPAM_MS;
}

export type TurnFeedbackKind = "perfect" | "close";

export function turnFeedback(
  aheadPx: number,
  clean: boolean,
  perfectPx: number = TURN_TUNING_PERFECT_PX,
): TurnFeedbackKind | null {
  if (!clean) {
    return null;
  }
  if (aheadPx <= perfectPx) {
    return "perfect";
  }
  return aheadPx <= TURN_TUNING_CLOSE_PX ? "close" : null;
}

export function closeSparkCount(
  aheadPx: number,
  perfectPx: number = TURN_TUNING_PERFECT_PX,
): number {
  const span = TURN_TUNING_CLOSE_PX - perfectPx;
  const closeness = 1 - Math.min(1, Math.max(0, aheadPx - perfectPx) / span);
  return CLOSE_SPARKS_MIN + Math.round((CLOSE_SPARKS_MAX - CLOSE_SPARKS_MIN) * closeness);
}

export function tickTurnTimer(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}

export function turnBoostMultiplier(
  remainingMs: number,
  boostMs: number = TURN_TUNING_BOOST_MS,
): number {
  const fraction = Math.min(1, Math.max(0, remainingMs) / boostMs);
  return 1 + (TURN_TUNING_BOOST_MUL - 1) * fraction;
}

export type TurnFlashPulse = { scale: number; alpha: number; brighten: number };

export function turnFlashPulse(remainingMs: number): TurnFlashPulse {
  if (remainingMs <= 0) {
    return { scale: 1, alpha: 1, brighten: 0 };
  }
  const t = 1 - Math.min(1, remainingMs / TURN_FLASH_MS);
  const envelope =
    t < TURN_FLASH_ATTACK
      ? t / TURN_FLASH_ATTACK
      : 1 - (t - TURN_FLASH_ATTACK) / (1 - TURN_FLASH_ATTACK);
  return {
    scale: 1 + TURN_FLASH_SCALE * envelope,
    alpha: 1 - TURN_FLASH_ALPHA_DROP * envelope,
    brighten: TURN_FLASH_BRIGHTEN * envelope,
  };
}
