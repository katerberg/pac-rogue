import { afterEach, describe, expect, it } from "vitest";
import {
  BOSS_PELLET_SPAWN_CLEARANCE_TILES,
  bossTunnelMouths,
  pickBossPelletCells,
} from "./bossBoard";
import { GHOST_DIR } from "./ghostPath";
import { activateAsciiLayout, activateLayout, getActiveLayout, pelletCellCenters } from "./maze";
import { GENERATE_MAX_ATTEMPTS, generateMazeAsciiWithRetries } from "./mazeGenerate";

describe("bossTunnelMouths", () => {
  it("rotates clockwise from the bottom-left mouth", () => {
    expect(bossTunnelMouths([4, 16, 28], 28)).toEqual([
      { col: 0, row: 28, facing: GHOST_DIR.right },
      { col: 0, row: 16, facing: GHOST_DIR.right },
      { col: 0, row: 4, facing: GHOST_DIR.right },
      { col: 27, row: 4, facing: GHOST_DIR.left },
      { col: 27, row: 16, facing: GHOST_DIR.left },
      { col: 27, row: 28, facing: GHOST_DIR.left },
    ]);
  });

  it("returns no mouths without tunnels", () => {
    expect(bossTunnelMouths([], 28)).toEqual([]);
  });
});

describe("pickBossPelletCells", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("spreads 8 pellets across a generated boss board, clear of the player spawn", () => {
    for (let i = 0; i < 6; i += 1) {
      const result = generateMazeAsciiWithRetries(`boss-pellets-${i}`, GENERATE_MAX_ATTEMPTS, {
        tunnelCount: 3,
      });
      activateAsciiLayout(result!.ascii);
      const spawn = getActiveLayout().playerSpawn;
      const regular = pelletCellCenters().filter((cell) => cell.kind === "dot");
      const picks = pickBossPelletCells(regular, spawn, 8);
      expect(picks).toHaveLength(8);
      for (const pick of picks) {
        const fromSpawn = Math.abs(pick.col - spawn.col) + Math.abs(pick.row - spawn.row);
        expect(fromSpawn).toBeGreaterThan(BOSS_PELLET_SPAWN_CLEARANCE_TILES);
      }
      for (let a = 0; a < picks.length; a += 1) {
        for (let b = a + 1; b < picks.length; b += 1) {
          const d =
            Math.abs(picks[a]!.col - picks[b]!.col) + Math.abs(picks[a]!.row - picks[b]!.row);
          expect(d).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  it("returns every candidate when fewer than requested remain", () => {
    const cells = [
      { col: 20, row: 20 },
      { col: 25, row: 25 },
    ];
    expect(pickBossPelletCells(cells, { col: 0, row: 0 }, 8)).toHaveLength(2);
  });

  it("is deterministic and starts from the farthest cell", () => {
    const cells = [
      { col: 10, row: 0 },
      { col: 0, row: 10 },
      { col: 12, row: 12 },
    ];
    expect(pickBossPelletCells(cells, { col: 0, row: 0 }, 1)).toEqual([{ col: 12, row: 12 }]);
  });
});
