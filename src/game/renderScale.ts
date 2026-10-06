import Phaser from "phaser";
import { PLAYFIELD_WIDTH } from "../domain/playfield";
import { canvasSizeFor, renderScaleFor } from "../domain/renderScale";

export function windowCanvasSize(): { width: number; height: number } {
  return canvasSizeFor(
    renderScaleFor(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1),
  );
}

export function renderScaleOf(scene: Phaser.Scene): number {
  return scene.scale.gameSize.width / PLAYFIELD_WIDTH;
}

export function applyRenderScale(scene: Phaser.Scene): void {
  const zoomToCanvas = (): void => {
    scene.cameras.main.setOrigin(0, 0).setZoom(renderScaleOf(scene));
  };
  zoomToCanvas();
  scene.scale.on(Phaser.Scale.Events.RESIZE, zoomToCanvas);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, zoomToCanvas);
  });
}

export function followWindowRenderScale(game: Phaser.Game): void {
  window.addEventListener("resize", () => {
    const size = windowCanvasSize();
    if (size.width !== game.scale.gameSize.width || size.height !== game.scale.gameSize.height) {
      game.scale.setGameSize(size.width, size.height);
    }
  });
}
