import Phaser from "phaser";
import { TILE_SIZE } from "../../domain/maze";

const ECHO_DEPTH = 50;
const ECHO_COLOR = 0x4dd2ff;
const ECHO_STAGGER_MS = 80;
const ECHO_MS = 420;
const ECHO_THICKNESS_PX = 4;
const ECHO_DRIFT_TILES = 0.6;

type EchoEvent = { x: number; y: number; dx: number; dy: number; tiles: number };

export function playSonicBoomEcho(scene: Phaser.Scene, event: EchoEvent): void {
  const horizontal = event.dx !== 0;
  for (let i = 1; i <= event.tiles; i += 1) {
    const x = event.x + event.dx * TILE_SIZE * i;
    const y = event.y + event.dy * TILE_SIZE * i;
    const wave = scene.add
      .rectangle(
        x,
        y,
        horizontal ? ECHO_THICKNESS_PX : TILE_SIZE - 2,
        horizontal ? TILE_SIZE - 2 : ECHO_THICKNESS_PX,
        ECHO_COLOR,
      )
      .setDepth(ECHO_DEPTH)
      .setAlpha(0);
    scene.tweens.add({
      targets: wave,
      x: x + event.dx * TILE_SIZE * ECHO_DRIFT_TILES,
      y: y + event.dy * TILE_SIZE * ECHO_DRIFT_TILES,
      alpha: { from: 0.85 - i * 0.12, to: 0 },
      delay: (i - 1) * ECHO_STAGGER_MS,
      duration: ECHO_MS,
      ease: "Cubic.easeOut",
      onStart: () => wave.setAlpha(0.85 - i * 0.12),
      onComplete: () => wave.destroy(),
    });
  }
}

export function playSlipstreamEcho(scene: Phaser.Scene, event: EchoEvent): void {
  playSonicBoomEcho(scene, event);
  scene.time.delayedCall(event.tiles * ECHO_STAGGER_MS + ECHO_MS / 2, () =>
    playSonicBoomEcho(scene, {
      x: event.x + event.dx * TILE_SIZE * (event.tiles + 1),
      y: event.y + event.dy * TILE_SIZE * (event.tiles + 1),
      dx: -event.dx,
      dy: -event.dy,
      tiles: event.tiles,
    }),
  );
}
