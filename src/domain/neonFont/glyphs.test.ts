import { describe, expect, it } from "vitest";
import { assertBarCurvePath } from "./glyphGrammar";
import { NEON_DIGIT_PATHS, NEON_G_REPLACEMENT, NEON_REQUIRED_CHARS, neonGlyph } from "./glyphs";

const NOTEBOOK_INLET_G = [
  "M2 1 A1 1 0 0 0 1 0 A1 1 0 0 0 0 1 L0 3 A1 1 0 0 0 1 4 A1 1 0 0 0 2 3 L2 2 L1 2",
];

describe("neonFont glyphs", () => {
  it("covers every required character", () => {
    for (const ch of NEON_REQUIRED_CHARS) {
      expect(neonGlyph(ch), `missing ${JSON.stringify(ch)}`).toBeDefined();
    }
  });

  it("freezes approved digit paths", () => {
    for (const [digit, paths] of Object.entries(NEON_DIGIT_PATHS)) {
      expect(neonGlyph(digit)!.strands).toEqual([...paths]);
    }
  });

  it("uses the replacement G, not the notebook inlet-bar G", () => {
    expect(neonGlyph("G")!.strands).toEqual([...NEON_G_REPLACEMENT]);
    expect(neonGlyph("G")!.strands).not.toEqual(NOTEBOOK_INLET_G);
  });

  it("rejects diagonal strokes in the grammar lint", () => {
    expect(() => assertBarCurvePath("M0 0 L2 4", "diag")).toThrow(/diagonal/);
  });

  it("rejects non-quarter arcs", () => {
    expect(() => assertBarCurvePath("M0 0 A1 1 0 0 1 2 0", "half")).toThrow(/quarter/);
  });

  it("rejects points off the integer 3×5 grid", () => {
    expect(() => assertBarCurvePath("M0 2 L1.5 2", "fraction")).toThrow(/grid/);
    expect(() => assertBarCurvePath("M0 4 L0 5", "below")).toThrow(/grid/);
    expect(() => assertBarCurvePath("M3 0 L3 4", "right")).toThrow(/grid/);
  });

  it("rejects arcs that are not radius 1", () => {
    expect(() => assertBarCurvePath("M0 0 A2 2 0 0 1 2 2", "r2")).toThrow(/radius/);
  });

  it("has no lowercase glyphs (neon text renders uppercase)", () => {
    expect(NEON_REQUIRED_CHARS).not.toMatch(/[a-z]/);
    expect(neonGlyph("a")).toBeUndefined();
  });

  it("spans the full 0–4 height on every letter and digit", () => {
    for (const ch of "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      const ys = neonGlyph(ch)!.strands.flatMap((d) =>
        [...d.matchAll(/(-?\d+)\s+(-?\d+)(?=\s*(?:[A-Za-z]|$))/g)].map((m) => Number(m[2])),
      );
      expect(Math.min(...ys), ch).toBe(0);
      expect(Math.max(...ys), ch).toBe(4);
    }
  });
});
