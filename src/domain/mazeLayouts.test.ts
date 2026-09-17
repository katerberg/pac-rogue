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
    activateLayout("classic");
  });

  it("keeps classic derived anchors at known cells", () => {
    const classic = getLayout("classic");
    expect(classic.playerSpawn).toEqual({ col: 13, row: 23 });
    expect(classic.ghostHouseSpawn).toEqual({ col: 13, row: 14 });
    expect(classic.ghostHouseExit).toEqual({ col: 13, row: 11 });
    expect(classic.fruitSpawn).toEqual({ col: 13, row: 17 });
    expect(classic.pelletCount).toBe(244);
    expect(classic.fruitThresholds).toEqual([70, 170]);
    expect(classic.clydeReleasePellets).toBe(60);
    expect(classic.elroy1DotsLeft).toBe(20);
    expect(classic.elroy2DotsLeft).toBe(10);
  });

  it("builds arcade Ms. Pac Maze 1 with required features", () => {
    const layout = activateLayout("mspac");
    expect(layout.id).toBe("mspac");
    expect(getActiveLayout().id).toBe("mspac");
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
    expect(layout.clydeReleasePellets).toBe(55);
  });
});

describe("maze selection", () => {
  it("parses classic and mspac overrides", () => {
    expect(parseMazeParam(new URLSearchParams("maze=classic"))).toBe("classic");
    expect(parseMazeParam(new URLSearchParams("maze=mspac"))).toBe("mspac");
    expect(parseMazeParam(new URLSearchParams("maze=nope"))).toBeNull();
    expect(parseMazeParam(new URLSearchParams())).toBeNull();
  });

  it("prefers override over rng", () => {
    expect(pickLayoutId(() => 0, "mspac")).toBe("mspac");
    expect(pickLayoutId(() => 0.9, "classic")).toBe("classic");
  });

  it("picks both layouts from seeded rng", () => {
    expect(pickLayoutId(() => 0.49)).toBe("classic");
    expect(pickLayoutId(() => 0.5)).toBe("mspac");
  });
});
