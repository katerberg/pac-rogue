import { describe, expect, it } from "vitest";
import {
  NEON_TRACKING,
  glyphInkXBounds,
  neonGlyphMetrics,
  neonKern,
  pathInkXBounds,
} from "./glyphGrammar";
import { neonGlyph } from "./glyphs";
import { neonLineAdvance } from "./layout";
import { DEFAULT_TUNING } from "../tuning";

describe("neon glyph metrics", () => {
  it("reads path ink from H/V endpoints", () => {
    expect(pathInkXBounds("M0 2 L1 2")).toEqual({ minX: 0, maxX: 1 });
  });

  it("gives narrow stems a narrower advance than full-width rounds", () => {
    const thickness = DEFAULT_TUNING.fontThickness;
    const one = neonGlyphMetrics(neonGlyph("1")!, thickness, 0);
    const oh = neonGlyphMetrics(neonGlyph("0")!, thickness, 0);
    expect(glyphInkXBounds(neonGlyph("1")!).maxX - glyphInkXBounds(neonGlyph("1")!).minX).toBe(0);
    expect(one.advance).toBeLessThan(oh.advance - 0.5);
  });

  it("keeps a readable optical gap after stroke at default thickness", () => {
    const thickness = DEFAULT_TUNING.fontThickness;
    const m = neonGlyphMetrics(neonGlyph("H")!, thickness, 0);
    const ink = glyphInkXBounds(neonGlyph("H")!);
    const inkWidth = ink.maxX - ink.minX;
    const opticalGap = m.advance - inkWidth - thickness;
    expect(opticalGap).toBeCloseTo(NEON_TRACKING, 5);
  });

  it("widens advance when thickness increases so tubes do not collide", () => {
    const thin = neonGlyphMetrics(neonGlyph("H")!, 0.3, 0);
    const thick = neonGlyphMetrics(neonGlyph("H")!, 0.8, 0);
    expect(thick.advance).toBeGreaterThan(thin.advance);
  });

  it("applies letterSpacing as extra tracking", () => {
    const base = neonGlyphMetrics(neonGlyph("A")!, 0.4, 0);
    const loose = neonGlyphMetrics(neonGlyph("A")!, 0.4, 0.4);
    expect(loose.advance - base.advance).toBeCloseTo(0.4, 5);
  });

  it("kerns open-sided pairs without touching unrelated neighbors", () => {
    expect(neonKern("T", "A")).toBeLessThan(0);
    expect(neonKern("T", "-")).toBeLessThan(0);
    expect(neonKern("A", "V")).toBeLessThan(0);
    expect(neonKern("D", "O")).toBe(0);
    expect(neonKern("M", "A")).toBe(0);
  });

  it("kerns DOT-MAN so the hyphen pair is tighter than unkerned DOTXMAN", () => {
    const thickness = DEFAULT_TUNING.fontThickness;
    const withHyphen = neonLineAdvance("DOT-MAN", thickness, 0);
    const unkernedShape = neonLineAdvance("DOTXMAN", thickness, 0);
    // Hyphen is narrower than X; kerned title should not balloon past a 7-letter word of rounds.
    expect(withHyphen).toBeLessThan(unkernedShape);
    expect(withHyphen).toBeGreaterThan(14);
  });
});
