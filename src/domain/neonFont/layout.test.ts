import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../tuning";
import {
  neonCenteredLineOrigins,
  neonDisplayText,
  neonGlowDepth,
  neonGlowFrame,
  neonLineAdvance,
  neonLinePitch,
  neonStringAdvance,
  neonTextLocalHeight,
} from "./layout";

describe("neon text layout", () => {
  const thickness = DEFAULT_TUNING.fontThickness;

  it("shows neon strings in uppercase", () => {
    expect(neonDisplayText("Speed Burst\nx2 lives!")).toBe("SPEED BURST\nX2 LIVES!");
  });

  it("advances a line with kerning (DOT-MAN tighter than unkerned shape)", () => {
    const withHyphen = neonLineAdvance("DOT-MAN", thickness, 0);
    const unkernedShape = neonLineAdvance("DOTXMAN", thickness, 0);
    expect(withHyphen).toBeLessThan(unkernedShape);
    expect(withHyphen).toBeGreaterThan(14);
  });

  it("string advance is the widest line", () => {
    const wide = neonLineAdvance("DOT-MAN", thickness, 0);
    const narrow = neonLineAdvance("HI", thickness, 0);
    expect(neonStringAdvance("HI\nDOT-MAN", thickness, 0)).toBeCloseTo(wide, 5);
    expect(neonStringAdvance("DOT-MAN\nHI", thickness, 0)).toBeCloseTo(wide, 5);
    expect(narrow).toBeLessThan(wide);
  });

  it("centers shorter lines under the widest when centerAlign", () => {
    const lines = ["HI", "DOT-MAN"] as const;
    const { maxWidth, originsX } = neonCenteredLineOrigins(lines, thickness, 0, true);
    const hi = neonLineAdvance("HI", thickness, 0);
    const title = neonLineAdvance("DOT-MAN", thickness, 0);
    expect(maxWidth).toBeCloseTo(title, 5);
    expect(originsX[0]).toBeCloseTo((title - hi) / 2, 5);
    expect(originsX[1]).toBe(0);
  });

  it("left-aligns when centerAlign is false", () => {
    const { originsX } = neonCenteredLineOrigins(["HI", "DOT-MAN"], thickness, 0, false);
    expect(originsX).toEqual([0, 0]);
  });

  it("local height adds leading and line spacing only between lines", () => {
    expect(neonLinePitch(10, 4)).toBe(19);
    expect(neonTextLocalHeight(0, 10, 4)).toBe(0);
    expect(neonTextLocalHeight(1, 10, 4)).toBe(10);
    expect(neonTextLocalHeight(2, 10, 4)).toBe(29);
    expect(neonTextLocalHeight(3, 10, 4)).toBe(48);
  });

  it("centers the glow source on the text box in canvas pixels", () => {
    const frame = neonGlowFrame({
      localWidth: 40,
      localHeight: 10,
      pixelsPerWorld: 2,
      scaleX: 1.5,
      scaleY: -1,
      reachPx: 6,
    });
    expect(frame.originX).toBe(-40);
    expect(frame.originY).toBe(-10);
    expect(frame.scaleX).toBe(0.75);
    expect(frame.scaleY).toBe(-0.5);
    expect(frame.filterWidth).toBe(40 * 2 * 1.5 + 12);
    expect(frame.filterHeight).toBe(10 * 2 + 12);
  });

  it("glow depth follows the outermost ancestor, else local depth", () => {
    expect(neonGlowDepth(0, [])).toBeCloseTo(-0.1, 5);
    expect(neonGlowDepth(0, [10])).toBeCloseTo(9.9, 5);
    expect(neonGlowDepth(0, [1, 900])).toBeCloseTo(899.9, 5);
  });
});
