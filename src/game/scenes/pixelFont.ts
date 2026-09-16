import Phaser from "phaser";

export const PIXEL_FONT_KEY = "pac-pixel";
const PIXEL_FONT_ATLAS_KEY = "pac-pixel-atlas";
const CHAR_SIZE = 8;
const CHARS_PER_ROW = 16;
const CHARSET = Phaser.GameObjects.RetroFont.TEXT_SET1;

export const HUD_FONT_SIZE = 16;
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

  const data = Phaser.GameObjects.RetroFont.Parse(scene, {
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
  });

  scene.cache.bitmapFont.add(PIXEL_FONT_KEY, {
    data,
    texture: PIXEL_FONT_ATLAS_KEY,
    frame: null,
  });
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
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${CHAR_SIZE}px monospace`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  for (let index = 0; index < CHARSET.length; index += 1) {
    const glyph = CHARSET[index]!;
    const cellX = (index % CHARS_PER_ROW) * CHAR_SIZE;
    const cellY = Math.floor(index / CHARS_PER_ROW) * CHAR_SIZE;
    ctx.fillText(glyph, cellX, cellY);
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = pixels[i]! + pixels[i + 1]! + pixels[i + 2]!;
    if (luminance > 200) {
      pixels[i] = 255;
      pixels[i + 1] = 255;
      pixels[i + 2] = 255;
      pixels[i + 3] = 255;
    } else {
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  canvasTexture.refresh();
}
