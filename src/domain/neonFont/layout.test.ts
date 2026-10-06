import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../tuning";
import {
  neonCenteredLineOrigins,
  neonLineAdvance,
  neonStringAdvance,
  neonTextLocalHeight,
} from "./layout";

describe("neon text layout", () => {
  const thickness = DEFAULT_TUNING.fontThickness;

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

  it("local height adds line spacing only between lines", () => {
    expect(neonTextLocalHeight(0, 10, 4)).toBe(0);
    expect(neonTextLocalHeight(1, 10, 4)).toBe(10);
    expect(neonTextLocalHeight(2, 10, 4)).toBe(24);
    expect(neonTextLocalHeight(3, 10, 4)).toBe(38);
  });
});
