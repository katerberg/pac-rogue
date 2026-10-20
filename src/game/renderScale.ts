import Phaser from "phaser";
import { PLAYFIELD_WIDTH } from "../domain/playfield";
import { crispArtQuad, type DeviceTransform } from "../domain/pixelArt";
import { canvasDisplayZoom, canvasSizeFor, renderScaleFor } from "../domain/renderScale";

type PixelArtMark = { pixelArt?: boolean };
type Snapped = {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

export function windowCanvas(): { width: number; height: number; zoom: number } {
  const { innerWidth, innerHeight } = window;
  const dpr = window.devicePixelRatio || 1;
  const size = canvasSizeFor(renderScaleFor(innerWidth, innerHeight, dpr));
  return { ...size, zoom: canvasDisplayZoom(size, innerWidth, innerHeight, dpr) };
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
  const snapped: Snapped[] = [];
  const snap = (): void => {
    const scale = renderScaleOf(scene);
    snapPixelArt(
      scene.children.list,
      { offsetX: 0, offsetY: 0, scaleX: scale, scaleY: scale },
      0,
      snapped,
    );
  };
  const restore = (): void => {
    for (const { image, x, y, scaleX, scaleY } of snapped) {
      image.setPosition(x, y).setScale(scaleX, scaleY);
    }
    snapped.length = 0;
  };
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, snap);
  scene.events.on(Phaser.Scenes.Events.RENDER, restore);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, zoomToCanvas);
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, snap);
    scene.events.off(Phaser.Scenes.Events.RENDER, restore);
  });
}

function isPixelArt(object: Phaser.GameObjects.GameObject): object is Phaser.GameObjects.Image {
  return (
    object instanceof Phaser.GameObjects.Image &&
    (object.texture.customData as PixelArtMark).pixelArt === true
  );
}

/**
 * Just before a frame renders, size and place every pixel-art image so each art pixel covers
 * the same whole number of device pixels; `restore` puts the authored values back afterwards.
 */
function snapPixelArt(
  list: readonly Phaser.GameObjects.GameObject[],
  toDevice: DeviceTransform,
  parentRotation: number,
  snapped: Snapped[],
): void {
  for (const object of list) {
    if (object instanceof Phaser.GameObjects.Container) {
      if (object.visible) {
        snapPixelArt(
          object.list,
          {
            offsetX: toDevice.offsetX + object.x * toDevice.scaleX,
            offsetY: toDevice.offsetY + object.y * toDevice.scaleY,
            scaleX: toDevice.scaleX * object.scaleX,
            scaleY: toDevice.scaleY * object.scaleY,
          },
          object.rotation === 0 ? parentRotation : Number.NaN,
          snapped,
        );
      }
      continue;
    }
    if (!isPixelArt(object) || !object.visible || object.alpha === 0) {
      continue;
    }
    const crisp = crispArtQuad(
      {
        x: object.x,
        y: object.y,
        width: object.displayWidth,
        height: object.displayHeight,
        originX: object.originX,
        originY: object.originY,
        rotation: parentRotation + object.rotation,
      },
      object.frame.realWidth,
      object.frame.realHeight,
      toDevice,
    );
    snapped.push({
      image: object,
      x: object.x,
      y: object.y,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
    });
    object
      .setPosition(crisp.x, crisp.y)
      .setScale(
        (Math.sign(object.scaleX) * crisp.width) / object.frame.realWidth,
        (Math.sign(object.scaleY) * crisp.height) / object.frame.realHeight,
      );
  }
}

export function followWindowRenderScale(game: Phaser.Game): void {
  window.addEventListener("resize", () => {
    const canvas = windowCanvas();
    if (canvas.zoom !== game.scale.zoom) {
      game.scale.setZoom(canvas.zoom);
    }
    if (
      canvas.width !== game.scale.gameSize.width ||
      canvas.height !== game.scale.gameSize.height
    ) {
      game.scale.setGameSize(canvas.width, canvas.height);
    }
  });
}

export function makeTextureCrisp(texture: Phaser.Textures.Texture): void {
  (texture.customData as PixelArtMark).pixelArt = true;
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
