import Phaser from "phaser";
import { textStyleFor, type GhostStyle } from "../../domain/ghostArt";
import { parseLineArt, type LineArt } from "../../domain/lineArt";
import {
  NEON_GLYPH_HEIGHT,
  NEON_GLYPH_WIDTH,
  type NeonGlyph,
} from "../../domain/neonFont/glyphGrammar";
import { neonGlyph } from "../../domain/neonFont/glyphs";
import { fontLineArtLook, type FontLineArtLook } from "../../domain/neonFont/fontLook";
import { DEFAULT_TUNING } from "../../domain/tuning";
import { renderScaleOf } from "../renderScale";
import { loadDebugTuning } from "../storage/debugTuningStorage";
import { loadGhostStyle } from "../storage/ghostStyleStorage";
import { ensurePixelFont, PIXEL_FONT_KEY, TEXT_COLOR_WHITE, addPixelText } from "./pixelFont";

const LINE_GLOW_QUALITY = 24;
const GLOW_SOURCE_INSET_PX = 2;
const glyphArtCache = new Map<string, LineArt>();

let activeFontLook: FontLineArtLook = fontLineArtLook(DEFAULT_TUNING);
let fontLookSynced = false;
const liveNeonTexts = new Set<NeonText>();

function glyphArtFor(char: string, glyph: NeonGlyph): LineArt {
  const cached = glyphArtCache.get(char);
  if (cached !== undefined) {
    return cached;
  }
  const paths = glyph.strands
    .map(
      (d, index) =>
        `<path id="g${char.charCodeAt(0)}-${index}" stroke="currentColor" fill="none" d="${d}" />`,
    )
    .join("");
  const art = parseLineArt(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NEON_GLYPH_WIDTH} ${NEON_GLYPH_HEIGHT}">${paths}</svg>`,
    0.15,
  );
  glyphArtCache.set(char, art);
  return art;
}

function setActiveFontLook(look: FontLineArtLook): void {
  activeFontLook = look;
  fontLookSynced = true;
  for (const text of liveNeonTexts) {
    text.applyLook(look);
  }
}

function syncFontLookFromStorage(): FontLineArtLook {
  const look = fontLineArtLook(loadDebugTuning());
  setActiveFontLook(look);
  return look;
}

function ensureFontLookSynced(): void {
  if (!fontLookSynced) {
    syncFontLookFromStorage();
  }
}

export { setActiveFontLook };

export class NeonText extends Phaser.GameObjects.Container {
  private content: string;
  private fontSize: number;
  private tintColor: number;
  private look: FontLineArtLook;
  private core: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics | null = null;
  private fallbackChars: Phaser.GameObjects.BitmapText[] = [];
  private localWidth = 0;
  private localHeight = 0;
  private ready = false;
  private lineSpacingPx = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    content: string,
    fontSize: number,
    color: number,
  ) {
    super(scene, x, y);
    ensureFontLookSynced();
    this.content = content;
    this.fontSize = fontSize;
    this.tintColor = color;
    this.look = activeFontLook;
    this.core = scene.add.graphics();
    this.add(this.core);
    scene.add.existing(this);
    liveNeonTexts.add(this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      liveNeonTexts.delete(this);
      this.glow?.destroy();
    });
    this.ready = true;
    this.rebuild();
  }

  setText(value: string | string[]): this {
    const next = Array.isArray(value) ? value.join("\n") : value;
    if (next === this.content) {
      return this;
    }
    this.content = next;
    this.rebuild();
    return this;
  }

  setTint(color: number): this {
    if (color === this.tintColor) {
      return this;
    }
    this.tintColor = color;
    this.rebuild();
    return this;
  }

  setCenterAlign(): this {
    return this;
  }

  setLineSpacing(value: number): this {
    this.lineSpacingPx = value;
    this.rebuild();
    return this;
  }

  clearTint(): this {
    return this.setTint(0xffffff);
  }

  setFontSize(size: number): this {
    if (size === this.fontSize) {
      return this;
    }
    this.fontSize = size;
    this.rebuild();
    return this;
  }

  getTextBounds(_update?: boolean): {
    local: { x: number; y: number; width: number; height: number };
  } {
    return {
      local: { x: 0, y: 0, width: this.localWidth, height: this.localHeight },
    };
  }

  applyLook(look: FontLineArtLook): void {
    this.look = look;
    this.rebuild();
  }

  private clearFallback(): void {
    for (const fb of this.fallbackChars) {
      fb.destroy();
    }
    this.fallbackChars = [];
  }

  private resetGlow(): Phaser.GameObjects.Graphics | null {
    if (this.glow !== null) {
      this.glow.destroy();
      this.glow = null;
    }
    if (this.look.glow === null) {
      return null;
    }
    // Sibling of the container (not a child): Glow filters mis-focus inside Containers.
    this.glow = this.scene.add.graphics();
    this.glow.setDepth(this.depth - 0.1);
    this.syncGlowTransform();
    return this.glow;
  }

  private syncGlowTransform(): void {
    if (!this.ready || this.glow === null) {
      return;
    }
    this.glow.setPosition(this.x, this.y);
    this.glow.setAlpha(this.alpha);
    this.glow.setVisible(this.visible);
    this.glow.setScale(this.scaleX, this.scaleY);
  }

  override setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    if (!this.ready) {
      return this;
    }
    this.syncGlowTransform();
    if (this.glow !== null && this.look.glow !== null) {
      this.glow.filterCamera.centerOn(this.x + this.localWidth / 2, this.y + this.localHeight / 2);
    }
    return this;
  }

  override setDepth(value: number): this {
    super.setDepth(value);
    if (this.ready) {
      this.glow?.setDepth(value - 0.1);
    }
    return this;
  }

  override setAlpha(value?: number): this {
    super.setAlpha(value);
    if (this.ready) {
      this.glow?.setAlpha(this.alpha);
    }
    return this;
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    if (this.ready) {
      this.glow?.setVisible(value);
    }
    return this;
  }

  override setScale(x?: number, y?: number): this {
    super.setScale(x, y);
    if (this.ready) {
      this.glow?.setScale(this.scaleX, this.scaleY);
    }
    return this;
  }

  private rebuild(): void {
    this.clearFallback();
    this.core.clear();
    const glow = this.resetGlow();

    const unit = this.fontSize / NEON_GLYPH_HEIGHT;
    const heightScale = this.look.heightScale;
    const strokeWidth = Math.max(0.5, this.look.thickness * this.fontSize);
    const lines = this.content.split("\n");
    let cursorY = 0;
    let maxWidth = 0;

    for (const line of lines) {
      let cursorX = 0;
      for (const char of line) {
        const glyph = neonGlyph(char);
        if (glyph === undefined) {
          ensurePixelFont(this.scene);
          const fb = this.scene.add
            .bitmapText(cursorX, cursorY, PIXEL_FONT_KEY, char, this.fontSize)
            .setTint(this.tintColor)
            .setOrigin(0, 0);
          this.add(fb);
          this.fallbackChars.push(fb);
          cursorX += this.fontSize * 0.6;
          continue;
        }
        if (glyph.strands.length === 0) {
          cursorX += (glyph.advance + this.look.letterSpacing) * unit;
          continue;
        }
        const art = glyphArtFor(char, glyph);
        this.strokeGlyph(
          this.core,
          art,
          cursorX,
          cursorY,
          unit,
          heightScale,
          strokeWidth,
          this.tintColor,
        );
        if (glow !== null && this.look.glow !== null) {
          const glowWidth = this.look.glowKnockout
            ? Math.max(0.5, strokeWidth - GLOW_SOURCE_INSET_PX)
            : strokeWidth;
          this.strokeGlyph(
            glow,
            art,
            cursorX,
            cursorY,
            unit,
            heightScale,
            glowWidth,
            this.look.glowColor,
          );
        }
        cursorX += (glyph.advance + this.look.letterSpacing) * unit;
      }
      maxWidth = Math.max(maxWidth, cursorX);
      cursorY += this.fontSize * heightScale + this.lineSpacingPx;
    }

    this.localWidth = maxWidth;
    this.localHeight = lines.length === 0 ? 0 : cursorY;
    this.setSize(Math.max(1, this.localWidth), Math.max(1, this.localHeight));
    this.refreshGlowFilter(glow);
  }

  private strokeGlyph(
    g: Phaser.GameObjects.Graphics,
    art: LineArt,
    offsetX: number,
    offsetY: number,
    unit: number,
    heightScale: number,
    strokeWidth: number,
    color: number,
  ): void {
    g.lineStyle(strokeWidth, color, 1);
    for (const strand of art.strands) {
      if (strand.stroke === "none" || strand.points.length === 0) {
        continue;
      }
      const points = strand.points.map(
        (p) => new Phaser.Math.Vector2(offsetX + p.x * unit, offsetY + p.y * unit * heightScale),
      );
      g.strokePoints(points, false, false);
    }
  }

  private refreshGlowFilter(glow: Phaser.GameObjects.Graphics | null): void {
    if (glow === null || this.look.glow === null) {
      return;
    }
    const pixelsPerWorld = renderScaleOf(this.scene);
    const reach = Math.ceil(this.look.glow.distancePx * pixelsPerWorld);
    glow.enableFilters();
    glow.filtersAutoFocus = false;
    glow.filtersFocusContext = false;
    glow.setFilterSize(
      Math.ceil(Math.max(1, this.localWidth) * pixelsPerWorld) + 2 * reach,
      Math.ceil(Math.max(1, this.localHeight) * pixelsPerWorld) + 2 * reach,
    );
    glow.filterCamera.setZoom(pixelsPerWorld);
    glow.filterCamera.centerOn(this.x + this.localWidth / 2, this.y + this.localHeight / 2);
    glow.filters!.internal.addGlow(
      this.look.glowColor,
      this.look.glow.outerStrength,
      0,
      1,
      true,
      LINE_GLOW_QUALITY,
      reach,
    );
  }
}

export type GameText = Phaser.GameObjects.BitmapText | NeonText;

export function isNeonText(text: GameText): text is NeonText {
  return text instanceof NeonText;
}

function addNeonText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  fontSize: number,
  color: number = TEXT_COLOR_WHITE,
): NeonText {
  return new NeonText(scene, x, y, content, fontSize, color);
}

export function addGameText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  fontSize: number,
  color: number = TEXT_COLOR_WHITE,
  style: GhostStyle = loadGhostStyle(),
): GameText {
  if (textStyleFor(style) === "neon") {
    return addNeonText(scene, x, y, content, fontSize, color);
  }
  return addPixelText(scene, x, y, content, fontSize, color);
}

export function placeGameText(
  text: GameText,
  x: number,
  y: number,
  originX = 0,
  originY = 0,
): void {
  const bounds = text.getTextBounds(true);
  if (!isNeonText(text)) {
    text.setOrigin(0, 0);
  }
  text.setPosition(
    Math.round(x - bounds.local.width * originX),
    Math.round(y - bounds.local.height * originY),
  );
}
