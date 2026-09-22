import { describe, expect, it } from "vitest";
import { solveTiling, TILING_CELL_COUNT, tilingOptionCount } from "./mazeTiling";

describe("mazeTiling", () => {
  it("builds a non-empty option set", () => {
    expect(tilingOptionCount()).toBeGreaterThan(100);
  });

  it("solves fixed seeds into a full piece cover", () => {
    for (const seed of ["a", "b", "demo-1", "pac-rogue"]) {
      const result = solveTiling(seed);
      expect(result.pieces.length).toBeGreaterThan(1);
      expect(result.pieces.some((piece) => piece.type === "center")).toBe(true);
      const covered = new Set(result.pieces.flatMap((piece) => piece.cells));
      expect(covered.size).toBe(TILING_CELL_COUNT);
    }
  });

  it("is deterministic for the same seed", () => {
    const a = solveTiling("same-seed");
    const b = solveTiling("same-seed");
    expect(a.pieces.map((piece) => piece.cells.join(","))).toEqual(
      b.pieces.map((piece) => piece.cells.join(",")),
    );
  });
});
