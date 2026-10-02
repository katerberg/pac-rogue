import Phaser from "phaser";
import type { TurnFeedbackKind } from "../../domain/turnTuning";

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
const CLOSE_COLOR = 0x66ddff;
const CLOSE_DISTANCE = 24;
const CLOSE_FAN_RAD = Math.PI / 3;
const CLOSE_FRONT_PX = 10;
const PERFECT_COLOR = 0xffe066;
const SHOCKWAVE_RADIUS = 10;
const SHOCKWAVE_WIDTH = 3;
const SHOCKWAVE_SCALE = 3.6;
const SHOCKWAVE_MS = 320;

export function playTurnSparks(scene: Phaser.Scene, event: TurnSparksEvent): void {
  if (event.kind === "close") {
    playCloseSparks(scene, event);
  } else {
    playShockwave(scene, event);
  }
}

function playCloseSparks(scene: Phaser.Scene, event: TurnSparksEvent): void {
  const heading = Math.atan2(event.dy, event.dx);
  const originX = event.x + event.dx * CLOSE_FRONT_PX;
  const originY = event.y + event.dy * CLOSE_FRONT_PX;
  for (let i = 0; i < event.count; i += 1) {
    const t = event.count === 1 ? 0.5 : i / (event.count - 1);
    const angle = heading + (t - 0.5) * 2 * CLOSE_FAN_RAD;
    const spark = scene.add
      .rectangle(originX, originY, SPARK_SIZE, SPARK_SIZE, CLOSE_COLOR)
      .setDepth(SPARK_DEPTH)
      .setAlpha(0.9);
    scene.tweens.add({
      targets: spark,
      x: originX + Math.cos(angle) * CLOSE_DISTANCE,
      y: originY + Math.sin(angle) * CLOSE_DISTANCE,
      alpha: 0,
      duration: SPARK_MS,
      ease: "Cubic.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
}

function playShockwave(scene: Phaser.Scene, event: TurnSparksEvent): void {
  const wave = scene.add
    .circle(event.x, event.y, SHOCKWAVE_RADIUS)
    .setStrokeStyle(SHOCKWAVE_WIDTH, PERFECT_COLOR, 1)
    .setDepth(SPARK_DEPTH);
  scene.tweens.add({
    targets: wave,
    scale: SHOCKWAVE_SCALE,
    alpha: 0,
    duration: SHOCKWAVE_MS,
    ease: "Cubic.easeOut",
    onComplete: () => wave.destroy(),
  });
}
