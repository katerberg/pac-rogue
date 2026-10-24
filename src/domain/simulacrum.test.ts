import { describe, expect, it } from "vitest";
import type { SolidGrid } from "./maze";
import { simulacrumSpawnTiles } from "./simulacrum";

function grid(rows: string[]): SolidGrid {
  return rows.map((row) => [...row].map((ch) => ch === "#"));
}

const solids = grid(["#######", "#.....#", "#.#.#.#", "#..#..#", "#######"]);
const layout = { ghostHouseExit: { col: 3, row: 1 }, playerSolids: solids };

describe("simulacrumSpawnTiles", () => {
  it("spawns nothing without the upgrade", () => {
    expect(simulacrumSpawnTiles(layout, 0)).toEqual([]);
  });

  it("spawns one copy above the ghost house", () => {
    expect(simulacrumSpawnTiles(layout, 1)).toEqual([{ col: 3, row: 1 }]);
  });

  it("adds a copy on the lowest walkable row nearest the centre, ties to the left", () => {
    expect(simulacrumSpawnTiles(layout, 2)).toEqual([
      { col: 3, row: 1 },
      { col: 2, row: 3 },
    ]);
  });

  it("skips a blocked tile and falls back to the next one", () => {
    expect(simulacrumSpawnTiles(layout, 1, [{ col: 3, row: 1 }])).toEqual([{ col: 2, row: 3 }]);
    expect(simulacrumSpawnTiles(layout, 2, [{ col: 2, row: 3 }])).toEqual([{ col: 3, row: 1 }]);
  });
});
