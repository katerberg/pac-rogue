import Phaser from "phaser";
import type { HeldKeys } from "./heldKeys";

type MoveKey = Phaser.Input.Keyboard.Key;

export function createHeldKeysReader(scene: Phaser.Scene): () => HeldKeys {
  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    throw new Error("playerInput requires Phaser's keyboard plugin");
  }
  const cursors = keyboard.createCursorKeys();
  const wasd = keyboard.addKeys("W,A,S,D") as Record<"W" | "A" | "S" | "D", MoveKey>;
  const latestDown = (keys: MoveKey[]): number | null => {
    let time: number | null = null;
    for (const key of keys) {
      if (key.isDown && (time === null || key.timeDown >= time)) {
        time = key.timeDown;
      }
    }
    return time;
  };
  return () => ({
    up: latestDown([cursors.up, wasd.W]),
    down: latestDown([cursors.down, wasd.S]),
    left: latestDown([cursors.left, wasd.A]),
    right: latestDown([cursors.right, wasd.D]),
  });
}
