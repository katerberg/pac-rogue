import { afterEach, describe, expect, it } from "vitest";
import {
  activateLayout,
  getActiveLayout,
  getLayout,
  isTunnelMouth,
  isWalkable,
  MAZE_COLS,
  MAZE_ROWS,
  parseMazeParam,
  pickLayoutId,
} from "./maze";

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
});

describe("maze selection", () => {
  it("parses maze1 and maze2 overrides", () => {
    expect(parseMazeParam(new URLSearchParams("maze=maze1"))).toBe("maze1");
    expect(parseMazeParam(new URLSearchParams("maze=maze2"))).toBe("maze2");
    expect(parseMazeParam(new URLSearchParams("maze=classic"))).toBeNull();
    expect(parseMazeParam(new URLSearchParams("maze=nope"))).toBeNull();
    expect(parseMazeParam(new URLSearchParams())).toBeNull();
  });

  it("prefers override over rng", () => {
    expect(pickLayoutId(() => 0, "maze2")).toBe("maze2");
    expect(pickLayoutId(() => 0.9, "maze1")).toBe("maze1");
  });

  it("picks both layouts from seeded rng", () => {
    expect(pickLayoutId(() => 0.49)).toBe("maze1");
    expect(pickLayoutId(() => 0.5)).toBe("maze2");
  });
});
