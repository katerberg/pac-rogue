import { query, type World } from "bitecs";
import Phaser from "phaser";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";

type MoveKey = Phaser.Input.Keyboard.Key;

export type PlayerInputOpts = { diagonalAllowed?: boolean; stopOnRelease?: boolean };

export type PlayerInputControl = {
  apply: (world: World, opts?: PlayerInputOpts) => void;
  anyMoveKeyDown: () => boolean;
};

export function createPlayerInput(scene: Phaser.Scene): PlayerInputControl {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error("playerInput requires Phaser's keyboard plugin");
  }

  const cursors = keyboard.createCursorKeys();
  const wasd = keyboard.addKeys("W,A,S,D") as {
    W: MoveKey;
    A: MoveKey;
    S: MoveKey;
    D: MoveKey;
  };

  const verticalBindings: { direction: Direction; keys: MoveKey[] }[] = [
    { direction: DIRECTION.up, keys: [cursors.up, wasd.W] },
    { direction: DIRECTION.down, keys: [cursors.down, wasd.S] },
  ];
  const horizontalBindings: { direction: Direction; keys: MoveKey[] }[] = [
    { direction: DIRECTION.left, keys: [cursors.left, wasd.A] },
    { direction: DIRECTION.right, keys: [cursors.right, wasd.D] },
  ];
  const allBindings = [...verticalBindings, ...horizontalBindings];

  return {
    apply: (world: World, opts?: PlayerInputOpts) => {
      const vertical = resolveAxisWinner(verticalBindings);
      const horizontal = resolveAxisWinner(horizontalBindings);
      const held = combineAxisDirections(vertical, horizontal, opts?.diagonalAllowed === true);
      if (held === DIRECTION.none && !opts?.stopOnRelease) {
        return;
      }
      for (const eid of query(world, [Input, Player])) {
        Input.direction[eid] = held;
      }
    },
    anyMoveKeyDown: () => allBindings.some(({ keys }) => keys.some((key) => key.isDown)),
  };
}

type AxisWinner = { direction: Direction; time: number };

function resolveAxisWinner(bindings: { direction: Direction; keys: MoveKey[] }[]): AxisWinner {
  let best: AxisWinner = { direction: DIRECTION.none, time: -1 };
  for (const { direction, keys } of bindings) {
    for (const key of keys) {
      if (key.isDown && key.timeDown >= best.time) {
        best = { direction, time: key.timeDown };
      }
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
