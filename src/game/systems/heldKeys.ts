import { query, type World } from "bitecs";
import type { SolidGrid } from "../../domain/maze";
import { turnTapAccepted, type CardinalStep } from "../../domain/turnTuning";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export type HeldKeys = {
  up: number | null;
  down: number | null;
  left: number | null;
  right: number | null;
};

export const NO_KEYS_HELD: HeldKeys = { up: null, down: null, left: null, right: null };

export type HeldKeysOpts = {
  diagonalAllowed?: boolean;
  stopOnRelease?: boolean;
  turnTuning?: { prevKeys: HeldKeys; solids: SolidGrid };
};

const CARDINAL_STEP: Record<number, CardinalStep> = {
  [DIRECTION.up]: { dx: 0, dy: -1 },
  [DIRECTION.down]: { dx: 0, dy: 1 },
  [DIRECTION.left]: { dx: -1, dy: 0 },
  [DIRECTION.right]: { dx: 1, dy: 0 },
};

export function isPerpendicularTurn(from: Direction, to: Direction): boolean {
  const a = CARDINAL_STEP[from];
  const b = CARDINAL_STEP[to];
  return a !== undefined && b !== undefined && (a.dx !== 0) !== (b.dx !== 0);
}

const KEY_FOR_DIRECTION: Record<number, keyof HeldKeys> = {
  [DIRECTION.up]: "up",
  [DIRECTION.down]: "down",
  [DIRECTION.left]: "left",
  [DIRECTION.right]: "right",
};

function isFreshPress(prev: HeldKeys, keys: HeldKeys, direction: Direction): boolean {
  const key = KEY_FOR_DIRECTION[direction];
  return key !== undefined && keys[key] !== null && keys[key] !== prev[key];
}

export function anyKeyHeld(keys: HeldKeys): boolean {
  return keys.up !== null || keys.down !== null || keys.left !== null || keys.right !== null;
}

export function applyHeldKeys(world: World, keys: HeldKeys, opts?: HeldKeysOpts): void {
  const vertical = axisWinner([
    [DIRECTION.up, keys.up],
    [DIRECTION.down, keys.down],
  ]);
  const horizontal = axisWinner([
    [DIRECTION.left, keys.left],
    [DIRECTION.right, keys.right],
  ]);
  const held = combineAxisDirections(vertical, horizontal, opts?.diagonalAllowed === true);
  if (held === DIRECTION.none && !opts?.stopOnRelease) {
    return;
  }
  const tuning = opts?.turnTuning;
  for (const eid of query(world, [Input, Player])) {
    if (tuning && turnTuningBlocks(eid, held, keys, tuning)) {
      continue;
    }
    Input.direction[eid] = held;
  }
}

function turnTuningBlocks(
  eid: number,
  held: Direction,
  keys: HeldKeys,
  tuning: NonNullable<HeldKeysOpts["turnTuning"]>,
): boolean {
  const facing = Facing.direction[eid] ?? DIRECTION.none;
  if (held === facing) {
    return isPerpendicularTurn(facing, Input.direction[eid] ?? DIRECTION.none);
  }
  if (!isPerpendicularTurn(facing, held)) {
    return false;
  }
  return !(
    isFreshPress(tuning.prevKeys, keys, held) &&
    turnTapAccepted(
      Position.x[eid] ?? 0,
      Position.y[eid] ?? 0,
      CARDINAL_STEP[facing]!,
      CARDINAL_STEP[held]!,
      tuning.solids,
    )
  );
}

export type AxisWinner = { direction: Direction; time: number };

function axisWinner(candidates: [Direction, number | null][]): AxisWinner {
  let best: AxisWinner = { direction: DIRECTION.none, time: -1 };
  for (const [direction, time] of candidates) {
    if (time !== null && time >= best.time) {
      best = { direction, time };
    }
  }
  return best;
}

const DIAGONAL_BY_AXES: Record<number, Record<number, Direction>> = {
  [DIRECTION.up]: { [DIRECTION.left]: DIRECTION.upLeft, [DIRECTION.right]: DIRECTION.upRight },
  [DIRECTION.down]: {
    [DIRECTION.left]: DIRECTION.downLeft,
    [DIRECTION.right]: DIRECTION.downRight,
  },
};

export function combineAxisDirections(
  vertical: AxisWinner,
  horizontal: AxisWinner,
  diagonalAllowed: boolean,
): Direction {
  const hasVertical = vertical.direction !== DIRECTION.none;
  const hasHorizontal = horizontal.direction !== DIRECTION.none;

  if (hasVertical && hasHorizontal) {
    if (diagonalAllowed) {
      return DIAGONAL_BY_AXES[vertical.direction]?.[horizontal.direction] ?? DIRECTION.none;
    }
    return vertical.time >= horizontal.time ? vertical.direction : horizontal.direction;
  }
  if (hasVertical) {
    return vertical.direction;
  }
  if (hasHorizontal) {
    return horizontal.direction;
  }
  return DIRECTION.none;
}
