import Phaser from "phaser";
import type { TurnFeedbackKind } from "../../domain/turnTuning";
import { TEXT_COLOR_WHITE, addPixelText, placePixelText } from "./pixelFont";

type TurnSparksEvent = {
  kind: TurnFeedbackKind;
  x: number;
  y: number;
  dx: number;
  dy: number;
  count: number;
};

const SPARK_DEPTH = 50;
const SPARK_SIZE = 3;
const SPARK_MS = 280;
const PERFECT_COLOR = 0xffe066;
const CLOSE_COLOR = 0x66ddff;
const PERFECT_DISTANCE = 26;
const CLOSE_DISTANCE = 24;
const CLOSE_FAN_RAD = Math.PI / 3;
const CLOSE_FRONT_PX = 10;
const CLOSE_TEXT = "Close!";
const CLOSE_TEXT_SIZE = 8;
const CLOSE_TEXT_ALPHA = 0.6;
const CLOSE_TEXT_RISE_PX = 10;
const CLOSE_TEXT_MS = 600;

export function playTurnSparks(scene: Phaser.Scene, event: TurnSparksEvent): void {
  const close = event.kind === "close";
  const heading = Math.atan2(event.dy, event.dx);
  const originX = event.x + (close ? event.dx * CLOSE_FRONT_PX : 0);
  const originY = event.y + (close ? event.dy * CLOSE_FRONT_PX : 0);
  for (let i = 0; i < event.count; i += 1) {
    const t = event.count === 1 ? 0.5 : i / (event.count - 1);
    const angle = close ? heading + (t - 0.5) * 2 * CLOSE_FAN_RAD : (i / event.count) * Math.PI * 2;
    const distance = close ? CLOSE_DISTANCE : PERFECT_DISTANCE;
    const spark = scene.add
      .rectangle(originX, originY, SPARK_SIZE, SPARK_SIZE, close ? CLOSE_COLOR : PERFECT_COLOR)
      .setDepth(SPARK_DEPTH)
      .setAlpha(0.9);
    scene.tweens.add({
      targets: spark,
      x: originX + Math.cos(angle) * distance,
      y: originY + Math.sin(angle) * distance,
      alpha: 0,
      duration: SPARK_MS,
      ease: "Cubic.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
  if (close) {
    const text = addPixelText(scene, 0, 0, CLOSE_TEXT, CLOSE_TEXT_SIZE, TEXT_COLOR_WHITE)
      .setDepth(SPARK_DEPTH)
      .setAlpha(CLOSE_TEXT_ALPHA);
    placePixelText(text, originX + event.dx * 14, originY + event.dy * 14 - 10, 0.5, 0.5);
    scene.tweens.add({
      targets: text,
      x: text.x + event.dx * CLOSE_TEXT_RISE_PX,
      y: text.y + event.dy * CLOSE_TEXT_RISE_PX - CLOSE_TEXT_RISE_PX,
      alpha: 0,
      duration: CLOSE_TEXT_MS,
      onComplete: () => text.destroy(),
    });
  }
}
