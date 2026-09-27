import { describe, expect, it } from "vitest";
import { corridorOccupied, tileKey } from "./bossGhostBlocking";

function grid(lines: string[]): boolean[][] {
  return lines.map((line) => [...line].map((ch) => ch === "#"));
}

// A plus-shaped junction at (3,1) and an L-bend at (6,1)→(6,3).
const SOLIDS = grid(["########", "-------#", "###-##-#", "###-##-#", "########"]);

describe("corridorOccupied", () => {
  it("sees a ghost further down the same corridor", () => {
    expect(corridorOccupied(0, 1, 1, 0, new Set([tileKey(2, 1)]), SOLIDS)).toBe(true);
  });

  it("stops at the first junction", () => {
    expect(corridorOccupied(0, 1, 1, 0, new Set([tileKey(3, 1)]), SOLIDS)).toBe(true);
    expect(corridorOccupied(0, 1, 1, 0, new Set([tileKey(5, 1)]), SOLIDS)).toBe(false);
  });

  it("follows a bend until the dead end", () => {
    expect(corridorOccupied(4, 1, 1, 0, new Set([tileKey(6, 3)]), SOLIDS)).toBe(true);
  });

  it("wraps through a side tunnel", () => {
    expect(corridorOccupied(1, 1, -1, 0, new Set([tileKey(7, 1)]), SOLIDS)).toBe(false);
    const tunnel = grid(["####", "----", "####"]);
    expect(corridorOccupied(0, 1, -1, 0, new Set([tileKey(2, 1)]), tunnel)).toBe(true);
  });

  it("is false for an empty corridor or a wall", () => {
    expect(corridorOccupied(0, 1, 1, 0, new Set(), SOLIDS)).toBe(false);
    expect(corridorOccupied(0, 1, 0, -1, new Set([tileKey(0, 0)]), SOLIDS)).toBe(false);
  });
});
