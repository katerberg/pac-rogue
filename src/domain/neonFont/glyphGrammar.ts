/** Shared neon bar-curve glyph geometry (viewBox units). */

export const NEON_GLYPH_WIDTH = 2;
export const NEON_GLYPH_HEIGHT = 4;
/**
 * Fallback advance when a glyph has no ink (e.g. space). Layout prefers
 * {@link neonGlyphMetrics} from ink bounds + side bearings.
 */
export const NEON_GLYPH_ADVANCE = 2.4;
/** Optical gap between adjacent stroke outsides at default tracking (viewBox units). */
export const NEON_TRACKING = 0.22;

export type NeonGlyph = {
  /** SVG path `d` strings; one subpath each (H/V + quarter arcs only). */
  readonly strands: readonly string[];
  /** Used for space / empty glyphs; ink glyphs ignore this in favor of metrics. */
  readonly advance: number;
};

export type NeonGlyphInk = { minX: number; maxX: number };

export type NeonGlyphMetrics = {
  /** Add to cursor before scaling path x by unit (viewBox units). */
  readonly drawShift: number;
  /** Advance to next glyph origin (viewBox units). */
  readonly advance: number;
  readonly ink: NeonGlyphInk;
};

const EPS = 1e-6;

/**
 * Lint a path `d` for the bar-curve grammar: only M/L/H/V/A/Z, L/H/V must stay
 * axis-aligned, arcs must be circular quarter turns (rx === ry, rotation 0, large-arc 0).
 */
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
      if (Math.abs(rx - ry) > EPS) {
        throw new Error(`neonFont ${label}: arc rx!=ry (${rx},${ry})`);
      }
      if (rot !== 0) {
        throw new Error(`neonFont ${label}: arc rotation must be 0`);
      }
      if (large !== 0) {
        throw new Error(`neonFont ${label}: large-arc must be 0 (quarter arcs only)`);
      }
      const dx = Math.abs(x2 - x);
      const dy = Math.abs(y2 - y);
      if (Math.abs(dx - ry) > 0.05 || Math.abs(dy - ry) > 0.05) {
        throw new Error(
          `neonFont ${label}: arc must be a quarter turn (got Δ(${dx},${dy}) r=${ry})`,
        );
      }
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
        const axisAligned = Math.abs(nx - x) < EPS || Math.abs(ny - y) < EPS;
        if (!axisAligned) {
          throw new Error(`neonFont ${label}: diagonal L ${x},${y} → ${nx},${ny}`);
        }
      }
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
      x = nx;
      i += 1;
      continue;
    }
    if (cmd === "V") {
      const ny = Number(tokens[i]);
      if (!Number.isFinite(ny)) {
        throw new Error(`neonFont ${label}: bad V arg`);
      }
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
 */
export function neonGlyphMetrics(
  glyph: NeonGlyph,
  thickness: number,
  letterSpacing: number,
): NeonGlyphMetrics {
  if (glyph.strands.length === 0) {
    return {
      drawShift: 0,
      advance: Math.max(0, glyph.advance + letterSpacing),
      ink: { minX: 0, maxX: 0 },
    };
  }
  const ink = glyphInkXBounds(glyph);
  const inkWidth = Math.max(ink.maxX - ink.minX, 0.05);
  const stroke = Math.max(0, thickness) * NEON_GLYPH_HEIGHT;
  const pad = stroke / 2 + (NEON_TRACKING + letterSpacing) / 2;
  return {
    drawShift: pad - ink.minX,
    advance: inkWidth + 2 * pad,
    ink,
  };
}

/**
 * Pair kerning in viewBox units (added to the left of `right` after `left`'s advance).
 * Negative values tuck open-sided pairs; keep modest so geometric ink never collides.
 */
const NEON_KERN_PAIRS: Readonly<Record<string, number>> = {
  TA: -0.22,
  Ta: -0.18,
  TC: -0.12,
  TG: -0.12,
  TO: -0.12,
  To: -0.1,
  TQ: -0.12,
  TV: -0.22,
  TW: -0.18,
  TY: -0.22,
  "T.": -0.28,
  "T,": -0.28,
  "T-": -0.32,
  FA: -0.22,
  Fa: -0.18,
  "F.": -0.28,
  "F,": -0.28,
  PA: -0.18,
  Pa: -0.15,
  "P.": -0.25,
  "P,": -0.25,
  LT: -0.18,
  LV: -0.15,
  LY: -0.15,
  "L-": -0.12,
  AV: -0.18,
  Av: -0.15,
  AW: -0.15,
  AY: -0.18,
  "A-": -0.12,
  VA: -0.18,
  Va: -0.15,
  "V.": -0.25,
  "V,": -0.25,
  "V-": -0.18,
  YA: -0.18,
  Ya: -0.15,
  "Y.": -0.25,
  "Y,": -0.25,
  "Y-": -0.18,
  "r.": -0.12,
  "r,": -0.12,
  "7-": -0.12,
};

export function neonKern(left: string, right: string): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  return NEON_KERN_PAIRS[left + right] ?? 0;
}

/** Total advance of a string in viewBox units (for tests / layout math). */
export function neonStringAdvance(
  text: string,
  thickness: number,
  letterSpacing: number,
  glyphFor: (ch: string) => NeonGlyph | undefined = () => undefined,
): number {
  let total = 0;
  let prev = "";
  for (const ch of text) {
    if (ch === "\n") {
      prev = "";
      continue;
    }
    if (prev !== "") {
      total += neonKern(prev, ch);
    }
    const glyph = glyphFor(ch);
    if (glyph === undefined) {
      total += NEON_GLYPH_WIDTH * 0.6;
    } else {
      total += neonGlyphMetrics(glyph, thickness, letterSpacing).advance;
    }
    prev = ch;
  }
  return total;
}
