import { query, type World } from "bitecs";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";

export type HeldKeys = {
  up: number | null;
  down: number | null;
  left: number | null;
  right: number | null;
};

export const NO_KEYS_HELD: HeldKeys = { up: null, down: null, left: null, right: null };

export type HeldKeysOpts = { diagonalAllowed?: boolean; stopOnRelease?: boolean };

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
  for (const eid of query(world, [Input, Player])) {
    Input.direction[eid] = held;
  }
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
