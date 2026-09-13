import { query, type World } from "bitecs";
import Phaser from "phaser";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";

type MoveKey = Phaser.Input.Keyboard.Key;

/**
 * Phaser keyboard → sticky Input.direction (queued next intent).
 *
 * While any move key is held, the most recently pressed direction wins.
 * On release, Input.direction is left unchanged (never cleared to none).
 */
export function createPlayerInput(scene: Phaser.Scene): (world: World) => void {
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

  const bindings: { direction: Direction; keys: MoveKey[] }[] = [
    { direction: DIRECTION.up, keys: [cursors.up, wasd.W] },
    { direction: DIRECTION.down, keys: [cursors.down, wasd.S] },
    { direction: DIRECTION.left, keys: [cursors.left, wasd.A] },
    { direction: DIRECTION.right, keys: [cursors.right, wasd.D] },
  ];

  return (world: World) => {
    const held = readHeldDirection(bindings);
    if (held === DIRECTION.none) {
      return;
    }
    for (const eid of query(world, [Input, Player])) {
      Input.direction[eid] = held;
    }
  };
}

function readHeldDirection(bindings: { direction: Direction; keys: MoveKey[] }[]): Direction {
  let best: Direction = DIRECTION.none;
  let bestTime = -1;

  for (const { direction, keys } of bindings) {
    for (const key of keys) {
      if (key.isDown && key.timeDown >= bestTime) {
        bestTime = key.timeDown;
        best = direction;
      }
    }
  }

  return best;
}
