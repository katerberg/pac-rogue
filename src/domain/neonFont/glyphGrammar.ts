export const NEON_GLYPH_WIDTH = 2;
export const NEON_GLYPH_HEIGHT = 4;
/** Optical gap between adjacent stroke outsides at default tracking (viewBox units). */
export const NEON_TRACKING = 0.32;

export type NeonGlyph = {
  /** SVG path `d` strings; one subpath each (H/V + quarter arcs only). */
  readonly strands: readonly string[];
  /** Space / empty glyphs only; ink glyphs advance via {@link neonGlyphMetrics}. */
  readonly advance?: number;
};

export type NeonGlyphInk = { minX: number; maxX: number };

export type NeonGlyphMetrics = {
  /** Add to cursor before scaling path x by unit (viewBox units). */
  readonly drawShift: number;
  /** Advance to next glyph origin (viewBox units). */
  readonly advance: number;
};

function tokenizePath(d: string): (string | number)[] {
  const tokens: (string | number)[] = [];
  const pattern = /([A-Za-z])|(-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?)|([\s,]+)|(.)/gi;
  for (const match of d.matchAll(pattern)) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(Number(match[2]));
    } else if (match[4] !== undefined) {
      throw new Error(`bad path data near "${match[4]}"`);
    }
  }
  return tokens;
}

function assertOnGrid(x: number, y: number, label: string): void {
  const onGrid =
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x <= NEON_GLYPH_WIDTH &&
    y >= 0 &&
    y <= NEON_GLYPH_HEIGHT;
  if (!onGrid) {
    throw new Error(`neonFont ${label}: point ${x},${y} is off the 3×5 grid`);
  }
}

/**
 * Lint a path `d` for the bar-curve grammar: only M/L/H/V/A/Z, every point on the
 * integer 3×5 grid, L/H/V axis-aligned, arcs r=1 quarter turns (rotation 0, large-arc 0).
 */
export function assertBarCurvePath(d: string, label: string): void {
  const tokens = tokenizePath(d);
  let i = 0;
  let cmd = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (typeof t === "string") {
      cmd = t.toUpperCase();
      if (!"MLHVAZ".includes(cmd)) {
        throw new Error(`neonFont ${label}: unsupported command ${t}`);
      }
      i += 1;
      if (cmd === "Z") {
        x = startX;
        y = startY;
      }
      continue;
    }
    if (cmd === "A") {
      const nums = tokens.slice(i, i + 7).map(Number);
      if (nums.length < 7 || nums.some((n) => !Number.isFinite(n))) {
        throw new Error(`neonFont ${label}: bad arc args near ${tokens[i]}`);
      }
      const [rx, ry, rot, large, , x2, y2] = nums as [
        number,
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      if (rx !== 1 || ry !== 1) {
        throw new Error(`neonFont ${label}: arc radius must be 1 (${rx},${ry})`);
      }
      if (rot !== 0) {
        throw new Error(`neonFont ${label}: arc rotation must be 0`);
      }
      if (large !== 0) {
        throw new Error(`neonFont ${label}: large-arc must be 0 (quarter arcs only)`);
      }
      const dx = Math.abs(x2 - x);
      const dy = Math.abs(y2 - y);
      if (dx !== 1 || dy !== 1) {
        throw new Error(`neonFont ${label}: arc must be a quarter turn (got Δ(${dx},${dy}))`);
      }
      assertOnGrid(x2, y2, label);
      x = x2;
      y = y2;
      i += 7;
      continue;
    }
    if (cmd === "M" || cmd === "L") {
      const nx = Number(tokens[i]);
      const ny = Number(tokens[i + 1]);
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
        throw new Error(`neonFont ${label}: bad ${cmd} args`);
      }
      if (cmd === "L") {
        if (nx !== x && ny !== y) {
          throw new Error(`neonFont ${label}: diagonal L ${x},${y} → ${nx},${ny}`);
        }
      }
      assertOnGrid(nx, ny, label);
      x = nx;
      y = ny;
      if (cmd === "M") {
        startX = x;
        startY = y;
      }
      i += 2;
      continue;
    }
    if (cmd === "H") {
      const nx = Number(tokens[i]);
      if (!Number.isFinite(nx)) {
        throw new Error(`neonFont ${label}: bad H arg`);
      }
      assertOnGrid(nx, y, label);
      x = nx;
      i += 1;
      continue;
    }
    if (cmd === "V") {
      const ny = Number(tokens[i]);
      if (!Number.isFinite(ny)) {
        throw new Error(`neonFont ${label}: bad V arg`);
      }
      assertOnGrid(x, ny, label);
      y = ny;
      i += 1;
      continue;
    }
    throw new Error(`neonFont ${label}: unexpected token ${t}`);
  }
}

export function assertBarCurveGlyph(glyph: NeonGlyph, label: string): void {
  if (glyph.strands.length === 0) {
    throw new Error(`neonFont ${label}: empty strands`);
  }
  for (const [index, d] of glyph.strands.entries()) {
    assertBarCurvePath(d, `${label}[${index}]`);
  }
}

/** Axis-aligned ink bounds of a bar-curve path (endpoints only; quarter arcs stay in bbox). */
export function pathInkXBounds(d: string): NeonGlyphInk {
  const tokens = tokenizePath(d);
  let i = 0;
  let cmd = "";
  let x = 0;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  const touch = (px: number): void => {
    minX = Math.min(minX, px);
    maxX = Math.max(maxX, px);
  };
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (typeof t === "string") {
      cmd = t.toUpperCase();
      i += 1;
      continue;
    }
    if (cmd === "A") {
      const x2 = Number(tokens[i + 5]);
      touch(x);
      touch(x2);
      x = x2;
      i += 7;
      continue;
    }
    if (cmd === "M" || cmd === "L") {
      x = Number(tokens[i]);
      touch(x);
      i += 2;
      continue;
    }
    if (cmd === "H") {
      x = Number(tokens[i]);
      touch(x);
      i += 1;
      continue;
    }
    if (cmd === "V") {
      touch(x);
      i += 1;
      continue;
    }
    if (cmd === "Z") {
      continue;
    }
    throw new Error(`neonFont ink: unexpected token ${t}`);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    throw new Error("neonFont ink: empty path");
  }
  return { minX, maxX };
}

export function glyphInkXBounds(glyph: NeonGlyph): NeonGlyphInk {
  if (glyph.strands.length === 0) {
    return { minX: 0, maxX: 0 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  for (const d of glyph.strands) {
    const ink = pathInkXBounds(d);
    minX = Math.min(minX, ink.minX);
    maxX = Math.max(maxX, ink.maxX);
  }
  return { minX, maxX };
}

/**
 * Proportional metrics: side bearings include half the stroke so thick tubes do not collide,
 * plus {@link NEON_TRACKING} (and knob letterSpacing) as the optical gap between outsides.
 * `thickness` is the stroke width in grid cells (one cell = fontSize / NEON_GLYPH_HEIGHT).
 */
export function neonGlyphMetrics(
  glyph: NeonGlyph,
  thickness: number,
  letterSpacing: number,
): NeonGlyphMetrics {
  if (glyph.strands.length === 0) {
    return {
      drawShift: 0,
      advance: Math.max(0, (glyph.advance ?? 0) + letterSpacing),
    };
  }
  const ink = glyphInkXBounds(glyph);
  const inkWidth = Math.max(ink.maxX - ink.minX, 0.05);
  const pad = Math.max(0, thickness) / 2 + (NEON_TRACKING + letterSpacing) / 2;
  return {
    drawShift: pad - ink.minX,
    advance: inkWidth + 2 * pad,
  };
}

/**
 * Pair kerning in viewBox units (added to the left of `right` after `left`'s advance).
 * Negative values tuck open-sided pairs; keep modest so geometric ink never collides.
 */
const NEON_KERN_PAIRS: Readonly<Record<string, number>> = {
  TA: -0.22,
  TC: -0.12,
  TG: -0.12,
  TO: -0.12,
  TQ: -0.12,
  TV: -0.22,
  TW: -0.18,
  TY: -0.22,
  "T.": -0.28,
  "T,": -0.28,
  "T-": -0.25,
  FA: -0.22,
  "F.": -0.28,
  "F,": -0.28,
  PA: -0.18,
  "P.": -0.25,
  "P,": -0.25,
  LT: -0.18,
  LV: -0.15,
  LY: -0.15,
  "L-": -0.12,
  AV: -0.18,
  AW: -0.15,
  AY: -0.18,
  "A-": -0.12,
  VA: -0.18,
  "V.": -0.25,
  "V,": -0.25,
  "V-": -0.18,
  YA: -0.18,
  "Y.": -0.25,
  "Y,": -0.25,
  "Y-": -0.18,
  "7-": -0.12,
};

export function neonKern(left: string, right: string): number {
  return NEON_KERN_PAIRS[left + right] ?? 0;
}
