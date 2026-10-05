import type Phaser from "phaser";

export const RENDER_SCALE = 3;

export function applyRenderScale(scene: Phaser.Scene): void {
  scene.cameras.main.setOrigin(0, 0).setZoom(RENDER_SCALE);
}
