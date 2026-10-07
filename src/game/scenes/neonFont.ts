import Phaser from "phaser";
import { textStyleFor, type GhostStyle } from "../../domain/ghostArt";
import { parseLineArt, type LineArt } from "../../domain/lineArt";
import {
  NEON_GLYPH_HEIGHT,
  NEON_GLYPH_WIDTH,
  neonGlyphMetrics,
  neonKern,
  type NeonGlyph,
} from "../../domain/neonFont/glyphGrammar";
import { neonGlyph } from "../../domain/neonFont/glyphs";
import {
  neonCenteredLineOrigins,
  neonDisplayText,
  neonGlowDepth,
  neonLinePitch,
  neonTextLocalHeight,
} from "../../domain/neonFont/layout";
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
  private glowPixelsPerWorld = 1;
  private glowReachPx = 0;
  private fallbackChars: Phaser.GameObjects.BitmapText[] = [];
  private localWidth = 0;
  private localHeight = 0;
  private ready = false;
  private lineSpacingPx = 0;
  private centerAlign = false;

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
    this.content = neonDisplayText(content);
    this.fontSize = fontSize;
    this.tintColor = color;
    this.look = activeFontLook;
    this.core = scene.add.graphics();
    this.add(this.core);
    scene.add.existing(this);
    liveNeonTexts.add(this);
    scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.syncGlowTransform, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      liveNeonTexts.delete(this);
      scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.syncGlowTransform, this);
      this.glow?.destroy();
    });
    this.ready = true;
    this.rebuild();
  }

  setText(value: string | string[]): this {
    const next = neonDisplayText(Array.isArray(value) ? value.join("\n") : value);
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
    if (this.centerAlign) {
      return this;
    }
    this.centerAlign = true;
    this.rebuild();
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
    this.glowPixelsPerWorld = renderScaleOf(this.scene);
    this.glowReachPx = Math.ceil(this.look.glow.distancePx * this.glowPixelsPerWorld);
    // Sibling of the container (not a child): Glow filters mis-focus inside Containers.
    // Drawn in canvas pixels around the text center at 1/pps scale, like line-art ghost glow.
    this.glow = this.scene.add.graphics();
    return this.glow;
  }

  private ancestorDepths(): number[] {
    const depths: number[] = [];
    let parent = this.parentContainer;
    while (parent !== null) {
      depths.push(parent.depth);
      parent = parent.parentContainer;
    }
    return depths;
  }

  private syncGlowDepth(): void {
    if (this.glow === null) {
      return;
    }
    this.glow.setDepth(neonGlowDepth(this.depth, this.ancestorDepths()));
  }

  private effectiveVisible(): boolean {
    if (!this.visible) {
      return false;
    }
    let parent: Phaser.GameObjects.Container | null = this.parentContainer;
    while (parent !== null) {
      if (!parent.visible) {
        return false;
      }
      parent = parent.parentContainer;
    }
    return true;
  }

  private effectiveAlpha(): number {
    let alpha = this.alpha;
    let parent = this.parentContainer;
    while (parent !== null) {
      alpha *= parent.alpha;
      parent = parent.parentContainer;
    }
    return alpha;
  }

  private syncGlowTransform = (): void => {
    if (!this.ready || this.glow === null) {
      return;
    }
    const matrix = this.getWorldTransformMatrix();
    const { scaleX, scaleY, rotation } = matrix.decomposeMatrix();
    const center = matrix.transformPoint(this.localWidth / 2, this.localHeight / 2);
    const pps = this.glowPixelsPerWorld;
    this.glow.setPosition(center.x, center.y);
    this.glow.setScale(scaleX / pps, scaleY / pps);
    this.glow.setRotation(rotation);
    this.glow.setAlpha(this.effectiveAlpha());
    this.glow.setVisible(this.effectiveVisible());
    this.syncGlowDepth();
    if (this.glow.filterCamera !== null) {
      this.glow.setFilterSize(
        Math.ceil(Math.max(1, this.localWidth) * pps * Math.abs(scaleX)) + 2 * this.glowReachPx,
        Math.ceil(Math.max(1, this.localHeight) * pps * Math.abs(scaleY)) + 2 * this.glowReachPx,
      );
      this.glow.filterCamera.centerOn(center.x, center.y);
    }
  };

  override setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    if (this.ready) {
      this.syncGlowTransform();
    }
    return this;
  }

  override setX(value?: number): this {
    super.setX(value);
    if (this.ready) {
      this.syncGlowTransform();
    }
    return this;
  }

  override setY(value?: number): this {
    super.setY(value);
    if (this.ready) {
      this.syncGlowTransform();
    }
    return this;
  }

  override setDepth(value: number): this {
    super.setDepth(value);
    if (this.ready) {
      this.syncGlowDepth();
    }
    return this;
  }

  override setAlpha(value?: number): this {
    super.setAlpha(value);
    if (this.ready) {
      this.syncGlowTransform();
    }
    return this;
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    if (this.ready) {
      this.syncGlowTransform();
    }
    return this;
  }

  override setScale(x?: number, y?: number): this {
    super.setScale(x, y);
    if (this.ready) {
      this.syncGlowTransform();
    }
    return this;
  }

  private rebuild(): void {
    this.clearFallback();
    this.core.clear();

    const unit = this.fontSize / NEON_GLYPH_HEIGHT;
    const heightScale = this.look.heightScale;
    const strokeWidth = Math.max(0.5, this.look.thickness * unit);
    const lines = this.content.split("\n");
    const { maxWidth: maxWidthVb, originsX } = neonCenteredLineOrigins(
      lines,
      this.look.thickness,
      this.look.letterSpacing,
      this.centerAlign,
    );
    const lineHeightPx = this.fontSize * heightScale;
    this.localWidth = maxWidthVb * unit;
    this.localHeight = neonTextLocalHeight(lines.length, lineHeightPx, this.lineSpacingPx);
    this.setSize(Math.max(1, this.localWidth), Math.max(1, this.localHeight));
    const glow = this.resetGlow();
    const pps = this.glowPixelsPerWorld;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]!;
      let cursorX = originsX[lineIndex]! * unit;
      const cursorY = lineIndex * neonLinePitch(lineHeightPx, this.lineSpacingPx);
      let prevChar = "";
      for (const char of line) {
        const glyph = neonGlyph(char);
        if (prevChar !== "") {
          cursorX += neonKern(prevChar, char) * unit;
        }
        if (glyph === undefined) {
          ensurePixelFont(this.scene);
          const fb = this.scene.add
            .bitmapText(cursorX, cursorY, PIXEL_FONT_KEY, char, this.fontSize)
            .setTint(this.tintColor)
            .setOrigin(0, 0);
          this.add(fb);
          this.fallbackChars.push(fb);
          cursorX += this.fontSize * 0.6;
          prevChar = char;
          continue;
        }
        const metrics = neonGlyphMetrics(glyph, this.look.thickness, this.look.letterSpacing);
        if (glyph.strands.length === 0) {
          cursorX += metrics.advance * unit;
          prevChar = char;
          continue;
        }
        const art = glyphArtFor(char, glyph);
        const glyphX = cursorX + metrics.drawShift * unit;
        this.strokeGlyph(
          this.core,
          art,
          glyphX,
          cursorY,
          unit,
          heightScale,
          strokeWidth,
          this.tintColor,
        );
        if (glow !== null) {
          const glowWidthPx = this.look.glowKnockout
            ? Math.max(0.5, strokeWidth * pps - GLOW_SOURCE_INSET_PX)
            : strokeWidth * pps;
          this.strokeGlyph(
            glow,
            art,
            (glyphX - this.localWidth / 2) * pps,
            (cursorY - this.localHeight / 2) * pps,
            unit * pps,
            heightScale,
            glowWidthPx,
            this.look.glowColor,
          );
        }
        cursorX += metrics.advance * unit;
        prevChar = char;
      }
    }

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
    g.fillStyle(color, 1);
    for (const strand of art.strands) {
      if (strand.stroke === "none" || strand.points.length === 0) {
        continue;
      }
      const points = strand.points.map(
        (p) => new Phaser.Math.Vector2(offsetX + p.x * unit, offsetY + p.y * unit * heightScale),
      );
      // Graphics strokes have butt caps and no joins: round every vertex so corners and ends close.
      for (const p of points) {
        g.fillCircle(p.x, p.y, strokeWidth / 2);
      }
      if (points.length > 1) {
        g.strokePoints(points, false, false);
      }
    }
  }

  private refreshGlowFilter(glow: Phaser.GameObjects.Graphics | null): void {
    if (glow === null || this.look.glow === null) {
      return;
    }
    glow.enableFilters();
    glow.filtersAutoFocus = false;
    glow.filtersFocusContext = false;
    glow.filterCamera.setZoom(this.glowPixelsPerWorld);
    this.syncGlowTransform();
    glow.filters!.internal.addGlow(
      this.look.glowColor,
      this.look.glow.outerStrength,
      0,
      1,
      true,
      LINE_GLOW_QUALITY,
      this.glowReachPx,
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
