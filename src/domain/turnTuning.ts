import {
  TILE_SIZE_PX,
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
export const TURN_TUNING_WINDOW_PX = TILE_SIZE_PX * 2;
export const TURN_TUNING_PERFECT_PX = 8;
export const TURN_TUNING_SPAM_MS = 300;

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
  for (let k = 0; ; k += 1) {
    const ahead = k * TILE_SIZE_PX - pastCenter;
    if (ahead > TURN_TUNING_WINDOW_PX) {
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

export function isPerfectTurn(aheadPx: number, clean: boolean): boolean {
  return clean && aheadPx <= TURN_TUNING_PERFECT_PX;
}

export function tickTurnTimer(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}

export function turnBoostMultiplier(remainingMs: number): number {
  const fraction = Math.min(1, Math.max(0, remainingMs) / TURN_TUNING_BOOST_MS);
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
