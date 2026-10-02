import Phaser from "phaser";
import type { TurnFeedbackKind } from "../../domain/turnTuning";

type TurnSparksEvent = {
  kind: TurnFeedbackKind;
  x: number;
  y: number;
  strength: number;
};

const CUE_DEPTH = 50;
const PERFECT_COLOR = 0xffe066;
const PERFECT_SPARK_COUNT = 12;
const PERFECT_SPARK_SIZE = 4;
const PERFECT_SPARK_DISTANCE = 34;
const PERFECT_SPARK_MS = 360;
const SHOCKWAVE_RADIUS = 10;
const SHOCKWAVE_WIDTH = 3;
const SHOCKWAVE_SCALE = 3.6;
const SHOCKWAVE_MS = 320;
const CLOSE_COLOR = 0x8fa3b8;
const CLOSE_RING_RADIUS = 16;
const CLOSE_RING_WIDTH = 2;
const CLOSE_RING_END_SCALE = 0.45;
const CLOSE_RING_MS = 220;

export function playTurnSparks(scene: Phaser.Scene, event: TurnSparksEvent): void {
  if (event.kind === "close") {
    playCloseRing(scene, event);
  } else {
    playPerfectBurst(scene, event);
  }
}

function playCloseRing(scene: Phaser.Scene, event: TurnSparksEvent): void {
  const ring = scene.add
    .circle(event.x, event.y, CLOSE_RING_RADIUS)
    .setStrokeStyle(CLOSE_RING_WIDTH, CLOSE_COLOR, 1)
    .setDepth(CUE_DEPTH)
    .setAlpha(event.strength);
  scene.tweens.add({
    targets: ring,
    scale: CLOSE_RING_END_SCALE,
    alpha: 0,
    duration: CLOSE_RING_MS,
    ease: "Quad.easeIn",
    onComplete: () => ring.destroy(),
  });
}

function playPerfectBurst(scene: Phaser.Scene, event: TurnSparksEvent): void {
  const wave = scene.add
    .circle(event.x, event.y, SHOCKWAVE_RADIUS)
    .setStrokeStyle(SHOCKWAVE_WIDTH, PERFECT_COLOR, 1)
    .setDepth(CUE_DEPTH);
  scene.tweens.add({
    targets: wave,
    scale: SHOCKWAVE_SCALE,
    alpha: 0,
    duration: SHOCKWAVE_MS,
    ease: "Cubic.easeOut",
    onComplete: () => wave.destroy(),
  });
  for (let i = 0; i < PERFECT_SPARK_COUNT; i += 1) {
    const angle = (i / PERFECT_SPARK_COUNT) * Math.PI * 2;
    const spark = scene.add
      .rectangle(event.x, event.y, PERFECT_SPARK_SIZE, PERFECT_SPARK_SIZE, PERFECT_COLOR)
      .setDepth(CUE_DEPTH)
      .setAngle((angle * 180) / Math.PI);
    scene.tweens.add({
      targets: spark,
      x: event.x + Math.cos(angle) * PERFECT_SPARK_DISTANCE,
      y: event.y + Math.sin(angle) * PERFECT_SPARK_DISTANCE,
      scale: 0.4,
      alpha: 0,
      duration: PERFECT_SPARK_MS,
      ease: "Cubic.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
}
