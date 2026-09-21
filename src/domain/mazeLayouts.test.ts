import { afterEach, describe, expect, it } from "vitest";
import { ghostHouseSeatCenters } from "./ghostHouseSeats";
import {
  activateLayout,
  getActiveLayout,
  getLayout,
  isTunnelMouth,
  isWalkable,
  MAZE_COLS,
  MAZE_ROWS,
  parseMaze,
  parseMazeParam,
  pelletCellCenters,
  pickLayoutId,
} from "./maze";
import { CLASSIC_MAZE_ASCII } from "./mazeLayouts";
import {
  blinkyScatterTarget,
  clydeScatterTarget,
  inkyScatterTarget,
  pinkyScatterTarget,
} from "./ghostTarget";

describe("maze layouts", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("keeps maze1 derived anchors at known cells", () => {
    const maze1 = getLayout("maze1");
    expect(maze1.playerSpawn).toEqual({ col: 13, row: 23 });
    expect(maze1.ghostHouseSpawn).toEqual({ col: 13, row: 14 });
    expect(maze1.ghostHouseExit).toEqual({ col: 13, row: 11 });
    expect(maze1.fruitSpawn).toEqual({ col: 13, row: 17 });
    expect(maze1.pelletCount).toBe(244);
    expect(maze1.fruitThresholds).toEqual([70, 170]);
    expect(maze1.inkyReleasePellets).toBe(30);
    expect(maze1.clydeReleasePellets).toBe(60);
    expect(maze1.elroy1DotsLeft).toBe(20);
    expect(maze1.elroy2DotsLeft).toBe(10);
    expect(maze1.cols).toBe(28);
    expect(maze1.rows).toBe(31);
  });

  it("builds maze2 arcade Ms. Pac Maze 1 with required features", () => {
    const layout = activateLayout("maze2");
    expect(layout.id).toBe("maze2");
    expect(getActiveLayout().id).toBe("maze2");
    expect(layout.ascii.split("\n")).toHaveLength(MAZE_ROWS);
    expect(layout.ascii.split("\n")[0]).toHaveLength(MAZE_COLS);

    expect(layout.playerSpawn).toEqual({ col: 13, row: 23 });
    expect(layout.ghostHouseSpawn).toEqual({ col: 13, row: 14 });
    expect(layout.ghostHouseExit).toEqual({ col: 13, row: 11 });
    expect(layout.fruitSpawn).toEqual({ col: 13, row: 17 });
    expect(isWalkable(layout.playerSpawn.col, layout.playerSpawn.row, layout.playerSolids)).toBe(
      true,
    );
    expect(isWalkable(layout.fruitSpawn.col, layout.fruitSpawn.row, layout.playerSolids)).toBe(
      true,
    );
    expect(
      isWalkable(layout.ghostHouseExit.col, layout.ghostHouseExit.row, layout.playerSolids),
    ).toBe(true);
    expect(layout.house.some((row) => row.some(Boolean))).toBe(true);
    expect(layout.door.some((row) => row.some(Boolean))).toBe(true);

    const dots = layout.ascii.split("").filter((ch) => ch === ".").length;
    const powerCount = layout.ascii.split("").filter((ch) => ch === "@").length;
    expect(dots).toBe(220);
    expect(powerCount).toBe(4);
    expect(layout.pelletCount).toBe(224);

    const tunnelRows = [];
    for (let row = 0; row < MAZE_ROWS; row += 1) {
      if (isTunnelMouth(0, row, layout.playerSolids)) {
        tunnelRows.push(row);
      }
    }
    expect(tunnelRows).toEqual([8, 17]);

    expect(layout.fruitThresholds).toEqual([64, 156]);
    expect(layout.elroy1DotsLeft).toBe(18);
    expect(layout.elroy2DotsLeft).toBe(9);
    expect(layout.inkyReleasePellets).toBe(28);
    expect(layout.clydeReleasePellets).toBe(55);
  });

  it("loads variable-size fixtures", () => {
    const small = activateLayout("mazeSmall");
    expect(small.cols).toBe(22);
    expect(small.rows).toBe(21);
    expect(small.tileSize).toBeGreaterThanOrEqual(12);
    expect(small.offsetX).toBeGreaterThanOrEqual(80);
    expect(small.pelletCount).toBeGreaterThanOrEqual(110);
    expect(small.pelletCount).toBeLessThanOrEqual(130);
    expect(small.ascii.includes("P")).toBe(true);
    expect(isWalkable(small.playerSpawn.col, small.playerSpawn.row, small.playerSolids)).toBe(true);
    expect(isWalkable(small.fruitSpawn.col, small.fruitSpawn.row, small.playerSolids)).toBe(true);
    expect(isWalkable(small.ghostHouseExit.col, small.ghostHouseExit.row, small.playerSolids)).toBe(
      true,
    );
    const smallTunnels: number[] = [];
    for (let row = 0; row < small.rows; row += 1) {
      if (isTunnelMouth(0, row, small.playerSolids)) {
        smallTunnels.push(row);
      }
    }
    expect(smallTunnels.length).toEqual(0);
    expect(ghostHouseSeatCenters()).toHaveLength(4);
    expect(small.door.some((row) => row.some(Boolean))).toBe(true);
    expect(small.house.some((row) => row.some(Boolean))).toBe(true);
    expect(blinkyScatterTarget()).toEqual({ col: 19, row: -3 });
    expect(pinkyScatterTarget()).toEqual({ col: 2, row: -3 });
    expect(inkyScatterTarget()).toEqual({ col: 21, row: 23 });
    expect(clydeScatterTarget()).toEqual({ col: 0, row: 23 });
  });

  it("rejects unknown maze glyphs", () => {
    const bad = CLASSIC_MAZE_ASCII.replace("P", "X");
    expect(() => parseMaze(bad)).toThrow(/unknown char/);
  });

  it("only places pellets on . and @ cells", () => {
    activateLayout("maze1");
    const pellets = pelletCellCenters();
    expect(pellets.every((p) => p.kind === "dot" || p.kind === "power")).toBe(true);
    expect(pellets.some((p) => p.kind === "power")).toBe(true);
    const ascii = getActiveLayout().ascii;
    for (const p of pellets) {
      const ch = ascii.split("\n")[p.row]?.[p.col];
      expect(ch === "." || ch === "@").toBe(true);
    }
  });
});

describe("maze selection", () => {
  it("parses maze1 and maze2 overrides", () => {
    expect(parseMazeParam(new URLSearchParams("maze=maze1"))).toBe("maze1");
    expect(parseMazeParam(new URLSearchParams("maze=maze2"))).toBe("maze2");
    expect(parseMazeParam(new URLSearchParams("maze=mazeSmall"))).toBe("mazeSmall");
    expect(parseMazeParam(new URLSearchParams("maze=mazeLarge"))).toBe("mazeLarge");
    expect(parseMazeParam(new URLSearchParams("maze=classic"))).toBeNull();
    expect(parseMazeParam(new URLSearchParams("maze=nope"))).toBeNull();
    expect(parseMazeParam(new URLSearchParams())).toBeNull();
  });

  it("prefers override over rng", () => {
    expect(pickLayoutId(() => 0, "maze2")).toBe("maze2");
    expect(pickLayoutId(() => 0.9, "maze1")).toBe("maze1");
    expect(pickLayoutId(() => 0, "mazeSmall")).toBe("mazeSmall");
  });

  it("picks both layouts from seeded rng", () => {
    expect(pickLayoutId(() => 0.49)).toBe("maze1");
    expect(pickLayoutId(() => 0.5)).toBe("maze2");
  });
});
