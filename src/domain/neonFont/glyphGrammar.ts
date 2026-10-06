/** Shared neon bar-curve glyph geometry (viewBox units). */

export const NEON_GLYPH_WIDTH = 2;
export const NEON_GLYPH_HEIGHT = 4;
/** Default advance = width + small gap (overridden per glyph when needed). */
export const NEON_GLYPH_ADVANCE = 2.4;

export type NeonGlyph = {
  /** SVG path `d` strings; one subpath each (H/V + quarter arcs only). */
  readonly strands: readonly string[];
  readonly advance: number;
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
