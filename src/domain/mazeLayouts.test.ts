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
  scaleCount,
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
    expect(layout.ascii.split("\n")).toHaveLength(MAZE_ROWS);
    expect(layout.ascii.split("\n")[0]).toHaveLength(MAZE_COLS);

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

    const powerCount = layout.ascii.split("").filter((ch) => ch === "@").length;
    expect(powerCount).toBe(4);
    expect(layout.pelletCount).toBeGreaterThan(100);

    const tunnelRows = [];
    for (let row = 0; row < MAZE_ROWS; row += 1) {
      if (isTunnelMouth(0, row, layout.playerSolids)) {
        tunnelRows.push(row);
      }
    }
    expect(tunnelRows.length).toBeGreaterThanOrEqual(1);

    expect(layout.fruitThresholds[0]).toBeLessThan(layout.fruitThresholds[1]);
    expect(layout.elroy2DotsLeft).toBeLessThan(layout.elroy1DotsLeft);
    expect(layout.clydeReleasePellets).toBe(
      scaleCount(60, layout.pelletCount, getLayout("classic").pelletCount),
    );
  });

  it("activates layout exports for helpers", () => {
    activateLayout("mspac");
    expect(getActiveLayout().id).toBe("mspac");
    activateLayout("classic");
    expect(getActiveLayout().id).toBe("classic");
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
