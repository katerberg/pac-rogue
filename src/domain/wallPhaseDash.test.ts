import { describe, expect, it } from "vitest";
import { wallPhaseDashLungeTarget } from "./wallPhaseDash";
import type { SolidGrid } from "./maze";

function buildGrid(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array<boolean>(cols).fill(false));
}

describe("wallPhaseDashLungeTarget", () => {
  it("finds a lunge target through a wall exactly 2 tiles thick", () => {
    const grid = buildGrid(5, 6);
    grid[2]![3] = true;
    grid[2]![4] = true;
    const solids: SolidGrid = grid;

    expect(wallPhaseDashLungeTarget(2, 2, 0, 0, solids)).toEqual({ col: 5, row: 2 });
  });

  it("rejects a wall 3+ tiles thick in that direction", () => {
    const grid = buildGrid(5, 7);
    grid[2]![2] = true;
    grid[2]![1] = true;
    grid[2]![0] = true;
    const solids: SolidGrid = grid;

    expect(wallPhaseDashLungeTarget(3, 2, 0, 0, solids)).toBeNull();
  });

  it("returns null when no orthogonal direction has an adjacent wall", () => {
    const grid = buildGrid(5, 5);
    const solids: SolidGrid = grid;

    expect(wallPhaseDashLungeTarget(2, 2, 0, 0, solids)).toBeNull();
  });

  it("returns null when the near wall is only 1 tile thick", () => {
    const grid = buildGrid(5, 5);
    grid[2]![3] = true;
    const solids: SolidGrid = grid;

    expect(wallPhaseDashLungeTarget(2, 2, 0, 0, solids)).toBeNull();
  });

  it("prefers the valid target closest to the player when multiple qualify", () => {
    const grid = buildGrid(7, 5);
    grid[1]![2] = true;
    grid[2]![2] = true;
    grid[4]![2] = true;
    grid[5]![2] = true;
    const solids: SolidGrid = grid;

    expect(wallPhaseDashLungeTarget(2, 3, 2, 6, solids)).toEqual({ col: 2, row: 6 });
    expect(wallPhaseDashLungeTarget(2, 3, 2, 0, solids)).toEqual({ col: 2, row: 0 });
  });

  it("ignores an out-of-bounds landing tile", () => {
    const grid = buildGrid(4, 3);
    grid[0]![1] = true;
    grid[1]![1] = true;
    const solids: SolidGrid = grid;

    expect(wallPhaseDashLungeTarget(1, 2, 1, 2, solids)).toBeNull();
  });
});
