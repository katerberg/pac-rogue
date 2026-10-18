import Phaser from "phaser";
import { CHAFF_COLOR } from "../../domain/chaff";

const BURST_DEPTH = 50;
const BURST_COUNT = 10;
const BURST_SIZE = 3;
const BURST_DISTANCE = 22;
const BURST_MS = 360;

export function playChaffBurst(scene: Phaser.Scene, event: { x: number; y: number }): void {
  for (let i = 0; i < BURST_COUNT; i += 1) {
    const angle = (i / BURST_COUNT) * Math.PI * 2;
    const spark = scene.add
      .rectangle(event.x, event.y, BURST_SIZE, BURST_SIZE, CHAFF_COLOR)
      .setDepth(BURST_DEPTH)
      .setAlpha(0.9);
    scene.tweens.add({
      targets: spark,
      x: event.x + Math.cos(angle) * BURST_DISTANCE,
      y: event.y + Math.sin(angle) * BURST_DISTANCE,
      alpha: 0,
      duration: BURST_MS,
      ease: "Cubic.easeOut",
      onComplete: () => spark.destroy(),
    });
  }
}
