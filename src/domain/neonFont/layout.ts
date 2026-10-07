import { NEON_GLYPH_HEIGHT, neonGlyphMetrics, neonKern, type NeonGlyph } from "./glyphGrammar";
import { neonGlyph } from "./glyphs";

/**
 * Fallback unknown-char advance in viewBox units.
 * Matches NeonText: `fontSize * 0.6` with `unit = fontSize / NEON_GLYPH_HEIGHT`.
 */
export const NEON_FALLBACK_ADVANCE = NEON_GLYPH_HEIGHT * 0.6;

/**
 * Scene-root glow depth for NeonText: use the outermost display-list ancestor's depth
 * (container nesting), else the text's own depth. Glow sits slightly under that.
 */
export function neonGlowDepth(localDepth: number, ancestorDepths: readonly number[]): number {
  const root = ancestorDepths.length > 0 ? ancestorDepths[ancestorDepths.length - 1]! : localDepth;
  return root - 0.1;
}

/**
 * Glow source geometry in canvas pixels, centered on the text box: the glow Graphics sits
 * at the box center (scaled by `scale / pixelsPerWorld`), so local (0,0) maps to `origin`.
 * The filter covers the scaled box plus the bloom reach on every side.
 */
export function neonGlowFrame(frame: {
  localWidth: number;
  localHeight: number;
  pixelsPerWorld: number;
  scaleX: number;
  scaleY: number;
  reachPx: number;
}): {
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
  filterWidth: number;
  filterHeight: number;
} {
  const { localWidth, localHeight, pixelsPerWorld: pps, scaleX, scaleY, reachPx } = frame;
  return {
    originX: (-localWidth / 2) * pps,
    originY: (-localHeight / 2) * pps,
    scaleX: scaleX / pps,
    scaleY: scaleY / pps,
    filterWidth: Math.ceil(Math.max(1, localWidth) * pps * Math.abs(scaleX)) + 2 * reachPx,
    filterHeight: Math.ceil(Math.max(1, localHeight) * pps * Math.abs(scaleY)) + 2 * reachPx,
  };
}

/**
 * Input hit rectangle for top-left-drawn neon text. Phaser hit-tests Containers as if they
 * were centered (it adds width/2, height/2 to the local pointer), so the rect is shifted by
 * the same amount to cover local (0,0)–(width,height).
 */
export function neonHitArea(
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  return { x: width / 2, y: height / 2, width, height };
}

/** Neon glyphs are uppercase-only. */
export function neonDisplayText(content: string): string {
  return content.toUpperCase();
}

export function neonCharAdvance(
  char: string,
  thickness: number,
  letterSpacing: number,
  glyph: NeonGlyph | undefined = neonGlyph(char),
): number {
  if (glyph === undefined) {
    return NEON_FALLBACK_ADVANCE;
  }
  return neonGlyphMetrics(glyph, thickness, letterSpacing).advance;
}

/** Single-line advance in viewBox units (kerning + per-glyph advances). */
export function neonLineAdvance(line: string, thickness: number, letterSpacing: number): number {
  let total = 0;
  let prev = "";
  for (const ch of line) {
    if (prev !== "") {
      total += neonKern(prev, ch);
    }
    total += neonCharAdvance(ch, thickness, letterSpacing);
    prev = ch;
  }
  return total;
}

/** Max line advance across a multi-line string (viewBox units). */
export function neonStringAdvance(
  content: string,
  thickness: number,
  letterSpacing: number,
): number {
  let max = 0;
  for (const line of content.split("\n")) {
    max = Math.max(max, neonLineAdvance(line, thickness, letterSpacing));
  }
  return max;
}

/**
 * Per-line origin X in viewBox units. When `centerAlign`, each line is offset so
 * shorter lines sit centered under the widest line (BitmapText setCenterAlign).
 */
export function neonCenteredLineOrigins(
  lines: readonly string[],
  thickness: number,
  letterSpacing: number,
  centerAlign: boolean,
): { maxWidth: number; originsX: number[] } {
  const widths = lines.map((line) => neonLineAdvance(line, thickness, letterSpacing));
  const maxWidth = widths.reduce((a, b) => Math.max(a, b), 0);
  const originsX = centerAlign ? widths.map((w) => (maxWidth - w) / 2) : widths.map(() => 0);
  return { maxWidth, originsX };
}

/**
 * Neon caps fill the whole line height, unlike the pixel font's built-in leading,
 * so stacked lines get this extra gap (fraction of line height).
 */
const NEON_LINE_LEADING = 0.5;

export function neonLinePitch(lineHeightPx: number, lineSpacingPx: number): number {
  return lineHeightPx * (1 + NEON_LINE_LEADING) + lineSpacingPx;
}

export function neonTextLocalHeight(
  lineCount: number,
  lineHeightPx: number,
  lineSpacingPx: number,
): number {
  if (lineCount <= 0) {
    return 0;
  }
  return lineHeightPx + (lineCount - 1) * neonLinePitch(lineHeightPx, lineSpacingPx);
}

/** Neon Play-HUD upgrade rows: 3× line height so per-row bloom does not collide. */
const NEON_UPGRADE_STACK_PITCH_MUL = 3;

export function upgradeStackRowPitch(lineHeightPx: number, textStyle: "neon" | "pixel"): number {
  return textStyle === "neon" ? lineHeightPx * NEON_UPGRADE_STACK_PITCH_MUL : lineHeightPx;
}

export function upgradeStackHeight(
  lineCount: number,
  lineHeightPx: number,
  textStyle: "neon" | "pixel",
): number {
  if (lineCount <= 0) {
    return 0;
  }
  return lineHeightPx + (lineCount - 1) * upgradeStackRowPitch(lineHeightPx, textStyle);
}
