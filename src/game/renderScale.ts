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

export function makeTextureCrisp(texture: Phaser.Textures.Texture): void {
  texture.setSmoothPixelArt(false);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function padTextureWithGutter(textures: Phaser.Textures.TextureManager, key: string): void {
  const source = textures.get(key).getSourceImage() as HTMLImageElement;
  const { width, height } = source;
  const padded = document.createElement("canvas");
  padded.width = width + 2;
  padded.height = height + 2;
  padded.getContext("2d")!.drawImage(source, 1, 1);
  textures.remove(key);
  const texture = textures.addCanvas(key, padded)!;
  texture.get().setSize(width, height, 1, 1);
  makeTextureCrisp(texture);
}
