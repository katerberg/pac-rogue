import { NEON_GLYPH_ADVANCE, type NeonGlyph, assertBarCurveGlyph } from "./glyphGrammar";

function g(
  strands: string | readonly string[],
  advance = NEON_GLYPH_ADVANCE,
  opticalInk?: NeonGlyph["opticalInk"],
): NeonGlyph {
  const list = typeof strands === "string" ? [strands] : [...strands];
  return opticalInk === undefined
    ? { strands: list, advance }
    : { strands: list, advance, opticalInk };
}

/**
 * Approved digit paths (2×4 grid, r=1 quarter arcs). Frozen by unit tests.
 * Uppercase G is the replacement silhouette (curl into bowl), not the notebook inlet-bar G.
 */
export const NEON_DIGIT_PATHS: Record<string, readonly string[]> = {
  "0": ["M0 1 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1"],
  "1": ["M1 0 L1 4"],
  "2": ["M0 1 A1 1 0 0 1 1 0 L1 0 A1 1 0 0 1 2 1 L2 2 A1 1 0 0 1 1 3 L0 3 L0 4 L2 4"],
  "3": [
    "M0 1 A1 1 0 0 1 1 0 L1 0 A1 1 0 0 1 2 1 L2 1 A1 1 0 0 1 1 2 L1 2 A1 1 0 0 1 2 3 L2 3 A1 1 0 0 1 1 4 L1 4 A1 1 0 0 1 0 3",
  ],
  "4": ["M0 0 L0 2 L2 2", "M2 0 L2 4"],
  "5": ["M2 0 L0 0 L0 2 L1 2 A1 1 0 0 1 2 3 L2 3 A1 1 0 0 1 1 4 L0 4"],
  "6": ["M2 0 L1 0 A1 1 0 0 0 0 1 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 2 A1 1 0 0 0 1 1 L0 1"],
  "7": ["M0 0 L1 0 A1 1 0 0 1 2 1 L2 4"],
  "8": [
    "M1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 A1 1 0 0 1 0 1 A1 1 0 0 1 1 0",
    "M1 2 A1 1 0 0 1 2 3 A1 1 0 0 1 1 4 A1 1 0 0 1 0 3 A1 1 0 0 1 1 2",
  ],
  "9": ["M0 4 L1 4 A1 1 0 0 0 2 3 L2 1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 L0 2 A1 1 0 0 0 1 3 L2 3"],
};

/** Replacement neon G: open bowl with right stem curling up into the center. */
export const NEON_G_REPLACEMENT: readonly string[] = [
  "M2 1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 2 L1.1 2 L1.1 1.2",
];

const GLYPHS: Record<string, NeonGlyph> = {
  " ": { strands: [], advance: 1.05 },

  "0": g(NEON_DIGIT_PATHS["0"]!),
  "1": g(NEON_DIGIT_PATHS["1"]!),
  "2": g(NEON_DIGIT_PATHS["2"]!),
  "3": g(NEON_DIGIT_PATHS["3"]!),
  "4": g(NEON_DIGIT_PATHS["4"]!),
  "5": g(NEON_DIGIT_PATHS["5"]!),
  "6": g(NEON_DIGIT_PATHS["6"]!),
  "7": g(NEON_DIGIT_PATHS["7"]!, NEON_GLYPH_ADVANCE, { minX: 0.55, maxX: 1.55 }),
  "8": g(NEON_DIGIT_PATHS["8"]!),
  "9": g(NEON_DIGIT_PATHS["9"]!),

  A: g(["M0 4 L0 1 A1 1 0 0 1 1 0 A1 1 0 0 1 2 1 L2 4", "M0 2 L2 2"]),
  B: g([
    "M0 0 L0 4 L1 4 A1 1 0 0 0 2 3 A1 1 0 0 0 1 2 L0 2",
    "M0 0 L1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 L0 2",
  ]),
  C: g(["M2 1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3"]),
  D: g(["M0 0 L0 4 L1 4 A1 1 0 0 0 2 3 L2 1 A1 1 0 0 0 1 0 L0 0"]),
  E: g(["M2 0 L0 0 L0 4 L2 4", "M0 2 L1.5 2"]),
  F: g(["M2 0 L0 0 L0 4", "M0 2 L1.5 2"], NEON_GLYPH_ADVANCE, { minX: 0, maxX: 1.45 }),
  G: g(NEON_G_REPLACEMENT),
  H: g(["M0 0 L0 4", "M2 0 L2 4", "M0 2 L2 2"]),
  I: g(["M0.35 0 L1.65 0", "M1 0 L1 4", "M0.35 4 L1.65 4"]),
  J: g(["M0 0 L2 0", "M1.5 0 L1.5 3 A1 1 0 0 1 0.5 4 L0.5 3"], NEON_GLYPH_ADVANCE, {
    minX: 0.35,
    maxX: 1.65,
  }),
  K: g(["M0 0 L0 4", "M2 0 L2 0 L1 0 L1 2 L0 2", "M1 2 L1 4 L2 4"]),
  L: g(["M0 0 L0 4 L2 4"], NEON_GLYPH_ADVANCE, { minX: 0, maxX: 1.45 }),
  M: g(
    ["M0 4 L0 0 L0.5 0 L0.5 4", "M0.5 0 L1 0 L1 2", "M1 0 L1.5 0 L1.5 4", "M1.5 0 L2 0 L2 4"],
    2.6,
  ),
  N: g(["M0 4 L0 0 L1 0 L1 4 L2 4 L2 0"]),
  O: g(["M0 1 A1 1 0 0 1 1 0 A1 1 0 0 1 2 1 L2 3 A1 1 0 0 1 1 4 A1 1 0 0 1 0 3 L0 1"]),
  P: g(["M0 4 L0 0 L1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 L0 2"], NEON_GLYPH_ADVANCE, {
    minX: 0,
    maxX: 1.55,
  }),
  Q: g(["M0 1 A1 1 0 0 1 1 0 A1 1 0 0 1 2 1 L2 3 A1 1 0 0 1 1 4 A1 1 0 0 1 0 3 L0 1", "M1 4 L1 3"]),
  R: g(["M0 4 L0 0 L1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 L0 2", "M1 2 L1 4 L2 4"]),
  S: g([
    "M2 1 A1 1 0 0 0 1 0 L1 0 A1 1 0 0 0 0 1 A1 1 0 0 0 1 2 L1 2 A1 1 0 0 1 2 3 A1 1 0 0 1 1 4 L1 4 A1 1 0 0 1 0 3",
  ]),
  T: g(["M0 0 L2 0", "M1 0 L1 4"], NEON_GLYPH_ADVANCE, { minX: 0.55, maxX: 1.45 }),
  U: g(["M0 0 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 0"]),
  V: g(["M0 0 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 0"]),
  W: g(["M0 0 L0 4 L0.5 4 L0.5 2", "M0.5 2 L1 2 L1 4 L1.5 4 L1.5 2", "M1.5 2 L2 2 L2 0"], 2.6),
  X: g([
    "M0 0 L1 0 L1 1 L0 1 L0 0",
    "M2 0 L1 0 L1 1 L2 1 L2 0",
    "M0 4 L1 4 L1 3 L0 3 L0 4",
    "M2 4 L1 4 L1 3 L2 3 L2 4",
    "M0.75 1 L0.75 3",
    "M1.25 1 L1.25 3",
  ]),
  Y: g(["M0 0 L0 1 A1 1 0 0 1 1 2", "M2 0 L2 1 A1 1 0 0 0 1 2", "M1 2 L1 4"]),
  Z: g(["M0 0 L2 0 L2 1 L1 1 L1 3 L0 3 L0 4 L2 4"]),

  a: g([
    "M2 1.5 L2 4",
    "M2 2.5 A1 1 0 0 0 1 1.5 A1 1 0 0 0 0 2.5 A1 1 0 0 0 1 3.5 A1 1 0 0 0 2 2.5",
  ]),
  b: g(["M0 0 L0 4", "M0 2.5 A1 1 0 0 1 1 1.5 A1 1 0 0 1 2 2.5 A1 1 0 0 1 1 3.5 A1 1 0 0 1 0 2.5"]),
  c: g(["M2 2 A1 1 0 0 0 1 1 A1 1 0 0 0 0 2 A1 1 0 0 0 1 3 A1 1 0 0 0 2 2"]),
  d: g(["M2 0 L2 4", "M2 2.5 A1 1 0 0 0 1 1.5 A1 1 0 0 0 0 2.5 A1 1 0 0 0 1 3.5 A1 1 0 0 0 2 2.5"]),
  e: g(["M0 2.5 L2 2.5 A1 1 0 0 0 1 1.5 A1 1 0 0 0 0 2.5 A1 1 0 0 0 1 3.5 A1 1 0 0 0 2 2.5"]),
  f: g(["M1.5 0.5 A0.5 0.5 0 0 0 1 0 L1 0 L1 4", "M0.25 1.5 L1.75 1.5"], 1.8),
  g: g([
    "M2 1.5 A1 1 0 0 0 1 0.5 A1 1 0 0 0 0 1.5 A1 1 0 0 0 1 2.5 A1 1 0 0 0 2 1.5 L2 3 A1 1 0 0 1 1 4 A1 1 0 0 1 0 3",
  ]),
  h: g(["M0 0 L0 4", "M0 2 A1 1 0 0 1 1 1 L2 1 L2 4"]),
  i: g(["M1 1.5 L1 4", "M1 0.3 L1 0.7"], 1.4),
  j: g(["M1.5 1.5 L1.5 3 A1 1 0 0 1 0.5 4 L0.5 3", "M1.5 0.3 L1.5 0.7"], 1.6),
  k: g(["M0 0 L0 4", "M2 1.5 L1 1.5 L1 2.5 L0 2.5", "M1 2.5 L1 4 L2 4"]),
  l: g(["M1 0 L1 4"], 1.4),
  m: g(
    [
      "M0 4 L0 1.5 L0.5 1.5 L0.5 4",
      "M0.5 1.5 L1 1.5 L1 4",
      "M1 1.5 L1.5 1.5 L1.5 4",
      "M1.5 1.5 L2 1.5 L2 4",
    ],
    2.6,
  ),
  n: g(["M0 4 L0 1.5", "M0 2 A1 1 0 0 1 1 1 L2 1 L2 4"]),
  o: g(["M0 2 A1 1 0 0 1 1 1 A1 1 0 0 1 2 2 A1 1 0 0 1 1 3 A1 1 0 0 1 0 2"]),
  p: g([
    "M0 1.5 L0 5",
    "M0 2.5 A1 1 0 0 1 1 1.5 A1 1 0 0 1 2 2.5 A1 1 0 0 1 1 3.5 A1 1 0 0 1 0 2.5",
  ]),
  q: g([
    "M2 1.5 L2 5",
    "M2 2.5 A1 1 0 0 0 1 1.5 A1 1 0 0 0 0 2.5 A1 1 0 0 0 1 3.5 A1 1 0 0 0 2 2.5",
  ]),
  r: g(["M0 4 L0 1.5", "M0 2 A1 1 0 0 1 1 1 L2 1"], 1.8),
  s: g([
    "M1.8 1.3 A0.5 0.5 0 0 0 1.3 0.8 L0.8 0.8 A0.5 0.5 0 0 0 0.3 1.3 A0.5 0.5 0 0 0 0.8 1.8 L1.2 1.8 A0.5 0.5 0 0 1 1.7 2.3 A0.5 0.5 0 0 1 1.2 2.8 L0.7 2.8 A0.5 0.5 0 0 1 0.2 2.3",
  ]),
  t: g(["M1 0 L1 3.5 A0.5 0.5 0 0 0 1.5 4", "M0.25 1.5 L1.75 1.5"], 1.8),
  u: g(["M0 1.5 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 1.5 L2 4"]),
  v: g(["M0 1.5 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 1.5"]),
  w: g(
    [
      "M0 1.5 L0 4 L0.5 4 L0.5 2.5",
      "M0.5 2.5 L1 2.5 L1 4 L1.5 4 L1.5 2.5",
      "M1.5 2.5 L2 2.5 L2 1.5",
    ],
    2.6,
  ),
  x: g([
    "M0 1.5 L1 1.5 L1 2.5 L0 2.5",
    "M2 1.5 L1 1.5 L1 2.5 L2 2.5",
    "M0 4 L1 4 L1 3 L0 3",
    "M2 4 L1 4 L1 3 L2 3",
    "M0.7 2.5 L0.7 3",
    "M1.3 2.5 L1.3 3",
  ]),
  y: g([
    "M0 1.5 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 1.5",
    "M2 3 L2 3.5 A0.5 0.5 0 0 1 1.5 4 L0.5 4",
  ]),
  z: g(["M0 1.5 L2 1.5 L2 2 L1 2 L1 3.5 L0 3.5 L0 4 L2 4"]),

  "!": g(["M1 0 L1 2.5", "M1 3.5 L1 4"], 1.4),
  "#": g(["M0.5 0 L0.5 4", "M1.5 0 L1.5 4", "M0 1.2 L2 1.2", "M0 2.8 L2 2.8"]),
  $: g([
    "M2 1 A1 1 0 0 0 1 0 L1 0 A1 1 0 0 0 0 1 A1 1 0 0 0 1 2 L1 2 A1 1 0 0 1 2 3 A1 1 0 0 1 1 4 L1 4 A1 1 0 0 1 0 3",
    "M1 0 L1 4",
  ]),
  "%": g([
    "M0 4 L0 3 L1 3 L1 2 L2 2 L2 0",
    "M0.3 0.3 L0.3 1 L1 1 L1 0.3 L0.3 0.3",
    "M1 3 L1 3.7 L1.7 3.7 L1.7 3 L1 3",
  ]),
  "'": g(["M1 0 L1 1.2"], 1.2),
  '"': g(["M0.6 0 L0.6 1.2", "M1.4 0 L1.4 1.2"], 1.6),
  "(": g(["M1.5 0 A1 1 0 0 0 0.5 1 L0.5 3 A1 1 0 0 0 1.5 4"], 1.6),
  ")": g(["M0.5 0 A1 1 0 0 1 1.5 1 L1.5 3 A1 1 0 0 1 0.5 4"], 1.6),
  "+": g(["M1 1 L1 3", "M0 2 L2 2"], 2),
  ",": g(["M1 3.2 L1 3.6 A0.4 0.4 0 0 1 0.6 4"], 1.2),
  "-": g(["M0.25 2 L1.75 2"], 2),
  ".": g(["M1 3.5 L1 4"], 1.2),
  "/": g(["M0 4 L0 3 L1 3 L1 1 L2 1 L2 0"]),
  ":": g(["M1 1 L1 1.5", "M1 3 L1 3.5"], 1.2),
  "<": g(["M1.5 0 L0.5 0 L0.5 2 L1.5 2", "M0.5 2 L0.5 4 L1.5 4"], 1.8),
  "=": g(["M0.25 1.5 L1.75 1.5", "M0.25 2.5 L1.75 2.5"], 2),
  ">": g(
    [
      "M0.5 0 L1.5 0 L1.5 1.5 L2 1.5 L2 2.5 L1.5 2.5 L1.5 4 L0.5 4 L0.5 2.5 L1 2.5 L1 1.5 L0.5 1.5 L0.5 0",
    ],
    1.8,
  ),
  "?": g(["M0 1 A1 1 0 0 1 1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 L1 2.8", "M1 3.5 L1 4"]),
  "[": g(["M1.5 0 L0.5 0 L0.5 4 L1.5 4"], 1.6),
  "]": g(["M0.5 0 L1.5 0 L1.5 4 L0.5 4"], 1.6),
};

for (const [ch, glyph] of Object.entries(GLYPHS)) {
  if (ch === " " || glyph.strands.length === 0) {
    continue;
  }
  assertBarCurveGlyph(glyph, JSON.stringify(ch));
}

export const NEON_REQUIRED_CHARS =
  " !\"#$%'()+,-./0123456789:<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZ[]abcdefghijklmnopqrstuvwxyz";

export function neonGlyph(char: string): NeonGlyph | undefined {
  if (char.length === 0) {
    return undefined;
  }
  return GLYPHS[char];
}
