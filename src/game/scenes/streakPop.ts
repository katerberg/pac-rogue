import type Phaser from "phaser";
import { STREAK_ENGINE_EVERY } from "../../domain/upgrades";
import { STREAK_POP_MS, streakPopLook } from "../../domain/streakEngine";
import {
  addPixelText,
  placePixelText,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";

const STREAK_POP_DEPTH = 850;

export function playStreakPop(
  scene: Phaser.Scene,
  event: { value: number; x: number; y: number },
): void {
  const size = UPGRADES_HUD_FONT_SIZE * streakPopLook(0, event.value, STREAK_ENGINE_EVERY).sizeMul;
  const text = addPixelText(scene, 0, 0, String(event.value), size, TEXT_COLOR_YELLOW)
    .setDepth(STREAK_POP_DEPTH)
    .setCenterAlign();
  placePixelText(text, event.x, event.y, 0.5, 1);
  const baseY = text.y;
  const clock = { progress: 0 };
  scene.tweens.add({
    targets: clock,
    progress: 1,
    duration: STREAK_POP_MS,
    onUpdate: () => {
      const look = streakPopLook(clock.progress, event.value, STREAK_ENGINE_EVERY);
      text.setY(baseY + look.dy).setAlpha(look.alpha);
    },
    onComplete: () => text.destroy(),
  });
}
