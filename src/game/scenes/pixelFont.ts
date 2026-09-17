import Phaser from "phaser";
import { font8x8Glyph } from "./font8x8Basic";

export const PIXEL_FONT_KEY = "pac-pixel";
const PIXEL_FONT_ATLAS_KEY = "pac-pixel-atlas";
const CHAR_SIZE = 8;
const CHARS_PER_ROW = 16;
const CHARSET = Phaser.GameObjects.RetroFont.TEXT_SET1;

export const HUD_FONT_SIZE = 16;
export const UPGRADES_HUD_FONT_SIZE = 8;
export const MENU_TITLE_FONT_SIZE = 32;
export const MENU_OPTION_FONT_SIZE = 16;
export const SCORES_FONT_SIZE = 16;

export const TEXT_COLOR_WHITE = 0xffffff;
export const TEXT_COLOR_YELLOW = 0xffff00;

export function ensurePixelFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(PIXEL_FONT_KEY)) {
    return;
  }

  if (!scene.textures.exists(PIXEL_FONT_ATLAS_KEY)) {
    buildPixelFontAtlas(scene);
  }

  scene.cache.bitmapFont.add(
    PIXEL_FONT_KEY,
    Phaser.GameObjects.RetroFont.Parse(scene, {
      image: PIXEL_FONT_ATLAS_KEY,
      width: CHAR_SIZE,
      height: CHAR_SIZE,
      chars: CHARSET,
      charsPerRow: CHARS_PER_ROW,
      lineSpacing: 0,
      "offset.x": 0,
      "offset.y": 0,
      "spacing.x": 0,
      "spacing.y": 0,
    }),
  );
}

export function addPixelText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  fontSize: number,
  color: number = TEXT_COLOR_WHITE,
): Phaser.GameObjects.BitmapText {
  ensurePixelFont(scene);
  return scene.add
    .bitmapText(x, y, PIXEL_FONT_KEY, content, fontSize)
    .setTint(color)
    .setOrigin(0, 0);
}

export function placePixelText(
  text: Phaser.GameObjects.BitmapText,
  x: number,
  y: number,
  originX = 0,
  originY = 0,
): void {
  text.setOrigin(0, 0);
  const bounds = text.getTextBounds(true);
  text.setPosition(
    Math.round(x - bounds.local.width * originX),
    Math.round(y - bounds.local.height * originY),
  );
}

function buildPixelFontAtlas(scene: Phaser.Scene): void {
  const rows = Math.ceil(CHARSET.length / CHARS_PER_ROW);
  const width = CHARS_PER_ROW * CHAR_SIZE;
  const height = rows * CHAR_SIZE;
  const canvasTexture = scene.textures.createCanvas(PIXEL_FONT_ATLAS_KEY, width, height);
  if (canvasTexture === null) {
    throw new Error("Failed to create pixel font atlas canvas");
  }

  const ctx = canvasTexture.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  const imageData = ctx.createImageData(width, height);
  const pixels = imageData.data;

  for (let index = 0; index < CHARSET.length; index += 1) {
    const glyph = font8x8Glyph(CHARSET.charCodeAt(index));
    if (glyph === undefined) {
      continue;
    }
    const cellX = (index % CHARS_PER_ROW) * CHAR_SIZE;
    const cellY = Math.floor(index / CHARS_PER_ROW) * CHAR_SIZE;
    for (let row = 0; row < CHAR_SIZE; row += 1) {
      const bits = glyph[row]!;
      for (let col = 0; col < CHAR_SIZE; col += 1) {
        if ((bits & (1 << col)) === 0) {
          continue;
        }
        const px = (cellY + row) * width + (cellX + col);
        const offset = px * 4;
        pixels[offset] = 255;
        pixels[offset + 1] = 255;
        pixels[offset + 2] = 255;
        pixels[offset + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  canvasTexture.refresh();
}
