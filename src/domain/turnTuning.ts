import {
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

export type CardinalStep = { dx: number; dy: number };

export function turnTapAccepted(
  x: number,
  y: number,
  facing: CardinalStep,
  turn: CardinalStep,
  solids: SolidGrid,
): boolean {
  let col = worldToCol(x);
  let row = worldToRow(y);
  const pastCenter =
    facing.dx !== 0 ? (x - cellCenterX(col)) * facing.dx : (y - cellCenterY(row)) * facing.dy;
  if (pastCenter > playerPreTurnPx()) {
    col += facing.dx;
    row += facing.dy;
  }
  return canEnterDirection(cellCenterX(col), cellCenterY(row), turn.dx, turn.dy, solids);
}

export function tickTurnBoost(remainingMs: number, deltaMs: number): number {
  return Math.max(0, remainingMs - Math.max(0, deltaMs));
}

export function turnBoostMultiplier(remainingMs: number): number {
  const fraction = Math.min(1, Math.max(0, remainingMs) / TURN_TUNING_BOOST_MS);
  return 1 + (TURN_TUNING_BOOST_MUL - 1) * fraction;
}
