import { type NeonGlyph, assertBarCurveGlyph } from "./glyphGrammar";

function g(strands: string | readonly string[]): NeonGlyph {
  return { strands: typeof strands === "string" ? [strands] : [...strands] };
}

/** Zero-length strand; the renderer draws it as a round dot one stroke wide. */
function dot(x: number, y: number): string {
  return `M${x} ${y} L${x} ${y}`;
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

export const NEON_G_REPLACEMENT: readonly string[] = [
  "M2 1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 A1 1 0 0 0 1 2",
];

const ARCH = "M0 4 L0 1 A1 1 0 0 1 1 0 A1 1 0 0 1 2 1 L2 4";
const BOWL = "M0 1 A1 1 0 0 1 1 0 A1 1 0 0 1 2 1 L2 3 A1 1 0 0 1 1 4 A1 1 0 0 1 0 3 L0 1";
const CUP = "M0 0 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 0";
const P_LOOP = "M0 4 L0 0 L1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 L0 2";
const S_CURVE =
  "M2 1 A1 1 0 0 0 1 0 L1 0 A1 1 0 0 0 0 1 A1 1 0 0 0 1 2 L1 2 A1 1 0 0 1 2 3 A1 1 0 0 1 1 4 L1 4 A1 1 0 0 1 0 3";
const STEM = "M1 0 L1 4";

const GLYPHS: Record<string, NeonGlyph> = {
  " ": { strands: [], advance: 1.2 },

  "0": g(NEON_DIGIT_PATHS["0"]!),
  "1": g(NEON_DIGIT_PATHS["1"]!),
  "2": g(NEON_DIGIT_PATHS["2"]!),
  "3": g(NEON_DIGIT_PATHS["3"]!),
  "4": g(NEON_DIGIT_PATHS["4"]!),
  "5": g(NEON_DIGIT_PATHS["5"]!),
  "6": g(NEON_DIGIT_PATHS["6"]!),
  "7": g(NEON_DIGIT_PATHS["7"]!),
  "8": g(NEON_DIGIT_PATHS["8"]!),
  "9": g(NEON_DIGIT_PATHS["9"]!),

  A: g([ARCH, "M0 2 L2 2"]),
  B: g([
    "M0 0 L0 4 L1 4 A1 1 0 0 0 2 3 A1 1 0 0 0 1 2 L0 2",
    "M0 0 L1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 L0 2",
  ]),
  C: g(["M2 1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3"]),
  D: g(["M0 0 L0 4 L1 4 A1 1 0 0 0 2 3 L2 1 A1 1 0 0 0 1 0 L0 0"]),
  E: g(["M2 0 L0 0 L0 4 L2 4", "M0 2 L1 2"]),
  F: g(["M2 0 L0 0 L0 4", "M0 2 L1 2"]),
  G: g(NEON_G_REPLACEMENT),
  H: g(["M0 0 L0 4", "M2 0 L2 4", "M0 2 L2 2"]),
  I: g(["M0 0 L2 0", STEM, "M0 4 L2 4"]),
  J: g(["M2 0 L2 3 A1 1 0 0 1 1 4 A1 1 0 0 1 0 3"]),
  K: g(["M0 0 L0 4", "M2 0 A1 1 0 0 1 1 1 A1 1 0 0 0 0 2", "M0 2 A1 1 0 0 0 1 3 A1 1 0 0 1 2 4"]),
  L: g(["M0 0 L0 4 L2 4"]),
  M: g([ARCH, STEM]),
  N: g([ARCH]),
  O: g([BOWL]),
  P: g([P_LOOP]),
  Q: g([BOWL, "M1 3 A1 1 0 0 0 2 4"]),
  R: g([P_LOOP, "M1 2 A1 1 0 0 1 2 3 L2 4"]),
  S: g([S_CURVE]),
  T: g(["M0 0 L2 0", STEM]),
  U: g([CUP]),
  V: g(["M0 0 L0 2 A1 1 0 0 0 1 3 A1 1 0 0 0 2 2 L2 0", "M1 3 L1 4"]),
  W: g([CUP, STEM]),
  X: g([
    "M0 0 L0 1 A1 1 0 0 0 1 2 A1 1 0 0 1 2 3 L2 4",
    "M2 0 L2 1 A1 1 0 0 1 1 2 A1 1 0 0 0 0 3 L0 4",
  ]),
  Y: g(["M0 0 L0 1 A1 1 0 0 0 1 2 A1 1 0 0 0 2 1 L2 0", "M1 2 L1 4"]),
  Z: g(["M0 0 L2 0 L2 1 A1 1 0 0 1 1 2 A1 1 0 0 0 0 3 L0 4 L2 4"]),

  "!": g(["M1 0 L1 3", dot(1, 4)]),
  "#": g(["M0 0 L0 4", "M2 0 L2 4", "M0 1 L2 1", "M0 3 L2 3"]),
  $: g([S_CURVE, STEM]),
  "%": g(["M0 4 L0 3 L1 3 L1 1 L2 1 L2 0", dot(0, 0), dot(2, 4)]),
  "'": g(["M1 0 L1 1"]),
  '"': g(["M0 0 L0 1", "M2 0 L2 1"]),
  "(": g(["M2 0 A1 1 0 0 0 1 1 L1 3 A1 1 0 0 0 2 4"]),
  ")": g(["M0 0 A1 1 0 0 1 1 1 L1 3 A1 1 0 0 1 0 4"]),
  "+": g(["M1 1 L1 3", "M0 2 L2 2"]),
  ",": g(["M1 3 A1 1 0 0 1 0 4"]),
  "-": g(["M0 2 L2 2"]),
  ".": g([dot(1, 4)]),
  "/": g(["M0 4 L0 3 L1 3 L1 1 L2 1 L2 0"]),
  ":": g([dot(1, 1), dot(1, 3)]),
  "<": g(["M2 0 A1 1 0 0 1 1 1 A1 1 0 0 0 0 2 A1 1 0 0 0 1 3 A1 1 0 0 1 2 4"]),
  "=": g(["M0 1 L2 1", "M0 3 L2 3"]),
  ">": g(["M0 0 A1 1 0 0 0 1 1 A1 1 0 0 1 2 2 A1 1 0 0 1 1 3 A1 1 0 0 0 0 4"]),
  "?": g(["M0 1 A1 1 0 0 1 1 0 A1 1 0 0 1 2 1 A1 1 0 0 1 1 2 L1 3", dot(1, 4)]),
  "[": g(["M1 0 L0 0 L0 4 L1 4"]),
  "]": g(["M0 0 L1 0 L1 4 L0 4"]),
};

for (const [ch, glyph] of Object.entries(GLYPHS)) {
  if (ch === " " || glyph.strands.length === 0) {
    continue;
  }
  assertBarCurveGlyph(glyph, JSON.stringify(ch));
}

export const NEON_REQUIRED_CHARS = " !\"#$%'()+,-./0123456789:<=>?ABCDEFGHIJKLMNOPQRSTUVWXYZ[]";

export function neonGlyph(char: string): NeonGlyph | undefined {
  if (char.length === 0) {
    return undefined;
  }
  return GLYPHS[char];
}
