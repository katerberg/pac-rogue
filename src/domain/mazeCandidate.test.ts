import { describe, expect, it } from "vitest";
import { candidateSeed, tunnelRowsFromLayout } from "./mazeCandidate";

describe("mazeCandidate", () => {
  it("builds deterministic candidate seeds", () => {
    expect(candidateSeed(0)).toBe("pool-cand-0");
    expect(candidateSeed(42)).toBe("pool-cand-42");
  });

  it("finds tunnel rows from layout edge solids", () => {
    expect(
      tunnelRowsFromLayout({
        cols: 3,
        rows: 3,
        playerSolids: [
          [true, false, true],
          [false, false, false],
          [true, false, true],
        ],
      }),
    ).toEqual([1]);
    expect(
      tunnelRowsFromLayout({
        cols: 3,
        rows: 2,
        playerSolids: [
          [true, true, true],
          [true, false, true],
        ],
      }),
    ).toEqual([]);
  });
});
