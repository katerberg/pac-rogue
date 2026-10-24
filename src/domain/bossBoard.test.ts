import { afterEach, describe, expect, it } from "vitest";
import {
  BOSS_PELLET_SPAWN_CLEARANCE_TILES,
  bossTunnelMouths,
  pickBossPelletCells,
} from "./bossBoard";
import { GHOST_DIR } from "./ghostPath";
import {
  activateAsciiLayout,
  activateLayout,
  getActiveLayout,
  getLayout,
  pelletCellCenters,
} from "./maze";
import { SWARM_BOSS_MAZE_ASCII } from "./mazeLayouts";

describe("bossTunnelMouths", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("finds the side tunnel and both vertical tunnel ends on the swarm board", () => {
    const { playerSolids, cols, rows } = activateAsciiLayout(SWARM_BOSS_MAZE_ASCII, "swarmBoss");
    const mouths = bossTunnelMouths(playerSolids);
    expect(mouths).toHaveLength(6);
    expect(mouths).toEqual(
      expect.arrayContaining([
        { col: 0, row: 21, facing: GHOST_DIR.right },
        { col: cols - 1, row: 21, facing: GHOST_DIR.left },
        { col: 1, row: 0, facing: GHOST_DIR.down },
        { col: cols - 2, row: 0, facing: GHOST_DIR.down },
        { col: 1, row: rows - 1, facing: GHOST_DIR.up },
        { col: cols - 2, row: rows - 1, facing: GHOST_DIR.up },
      ]),
    );
  });

  it("sends the first Blinkys from opposite vertical corners, keeping the side tunnel for later", () => {
    const { playerSolids, cols, rows } = activateAsciiLayout(SWARM_BOSS_MAZE_ASCII, "swarmBoss");
    const mouths = bossTunnelMouths(playerSolids);
    expect(mouths.slice(0, 2)).toEqual([
      { col: 1, row: 0, facing: GHOST_DIR.down },
      { col: cols - 2, row: rows - 1, facing: GHOST_DIR.up },
    ]);
    expect(mouths.slice(4).every((mouth) => mouth.row === 21)).toBe(true);
  });

  it("returns no mouths without tunnels", () => {
    const { playerSolids } = getLayout("mazeSmall");
    const sealed = playerSolids.map((row) => row.map((solid, col) => solid || col === 0));
    expect(bossTunnelMouths(sealed)).toEqual([]);
  });
});

describe("pickBossPelletCells", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("spreads the stage's boss pellets across the swarm board, clear of the player spawn", () => {
    activateAsciiLayout(SWARM_BOSS_MAZE_ASCII, "swarmBoss");
    const spawn = getActiveLayout().playerSpawn;
    const regular = pelletCellCenters().filter((cell) => cell.kind === "dot");
    const picks = pickBossPelletCells(regular, spawn, 3);
    expect(picks).toHaveLength(3);
    for (const pick of picks) {
      const fromSpawn = Math.abs(pick.col - spawn.col) + Math.abs(pick.row - spawn.row);
      expect(fromSpawn).toBeGreaterThan(BOSS_PELLET_SPAWN_CLEARANCE_TILES);
    }
    for (let a = 0; a < picks.length; a += 1) {
      for (let b = a + 1; b < picks.length; b += 1) {
        const d = Math.abs(picks[a]!.col - picks[b]!.col) + Math.abs(picks[a]!.row - picks[b]!.row);
        expect(d).toBeGreaterThanOrEqual(5);
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
