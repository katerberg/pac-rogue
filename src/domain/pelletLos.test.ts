import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, type SolidGrid } from "./maze";
import { hasPelletLineOfSight } from "./pelletLos";

function grid(rows: string[]): SolidGrid {
  return rows.map((line) => [...line].map((ch) => ch === "#"));
}

describe("hasPelletLineOfSight", () => {
  it("is true for the same cell", () => {
    const solids = grid(["...", "...", "..."]);
    const x = cellCenterX(1);
    const y = cellCenterY(1);
    expect(hasPelletLineOfSight(x, y, x, y, solids)).toBe(true);
  });

  it("is true along an open corridor", () => {
    const solids = grid(["###", "...", "###"]);
    expect(
      hasPelletLineOfSight(cellCenterX(0), cellCenterY(1), cellCenterX(2), cellCenterY(1), solids),
    ).toBe(true);
  });

  it("is false when a solid cell sits between", () => {
    const solids = grid(["...", ".#.", "..."]);
    expect(
      hasPelletLineOfSight(cellCenterX(0), cellCenterY(1), cellCenterX(2), cellCenterY(1), solids),
    ).toBe(false);
  });

  it("allows the pellet cell as the endpoint even if the walk ends there", () => {
    const solids = grid(["#.#", "...", "###"]);
    expect(
      hasPelletLineOfSight(cellCenterX(0), cellCenterY(1), cellCenterX(2), cellCenterY(0), solids),
    ).toBe(true);
  });
});
