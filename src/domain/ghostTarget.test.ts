import { describe, expect, it } from "vitest";
import {
  BLINKY_SCATTER_COL,
  BLINKY_SCATTER_ROW,
  CLYDE_SCATTER_COL,
  CLYDE_SCATTER_ROW,
  CLYDE_SHY_TILES,
  PINKY_LOOKAHEAD_TILES,
  PINKY_SCATTER_COL,
  PINKY_SCATTER_ROW,
  blinkyTarget,
  clydeTarget,
  pinkyTarget,
  GHOST_PHASE,
} from "./ghostTarget";
import { GHOST_AI_MODE } from "./ghostMode";
import { GHOST_DIR } from "./ghostPath";
import { getActiveLayout } from "./maze";

describe("blinkyTarget", () => {
  it("approaches the door column while leaving from a side seat", () => {
    const exit = getActiveLayout().ghostHouseExit;
    const spawnRow = getActiveLayout().ghostHouseSpawn.row;
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.leaving,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 100,
        playerCol: 10,
        playerRow: 20,
        ghostCol: exit.col - 2,
        ghostRow: spawnRow,
      }),
    ).toEqual({ col: exit.col, row: spawnRow });
  });

  it("targets the house exit while leaving on the door column", () => {
    const exit = getActiveLayout().ghostHouseExit;
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.leaving,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 100,
        playerCol: 10,
        playerRow: 20,
        ghostCol: exit.col,
        ghostRow: exit.row + 1,
      }),
    ).toEqual(exit);
  });

  it("uses the scatter corner when not Elroy", () => {
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 50,
        playerCol: 10,
        playerRow: 20,
      }),
    ).toEqual({ col: BLINKY_SCATTER_COL, row: BLINKY_SCATTER_ROW });
  });

  it("targets the player in chase and during Elroy scatter", () => {
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        pelletsRemaining: 50,
        playerCol: 10,
        playerRow: 20,
      }),
    ).toEqual({ col: 10, row: 20 });

    expect(
      blinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 20,
        playerCol: 9,
        playerRow: 8,
      }),
    ).toEqual({ col: 9, row: 8 });
  });

  it("scatters during Elroy when ignoreElroy is set (scatter burst)", () => {
    expect(
      blinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        pelletsRemaining: 10,
        playerCol: 9,
        playerRow: 8,
        ignoreElroy: true,
      }),
    ).toEqual({ col: BLINKY_SCATTER_COL, row: BLINKY_SCATTER_ROW });
  });
});

describe("pinkyTarget", () => {
  it("targets the house exit while leaving on the door column", () => {
    const exit = getActiveLayout().ghostHouseExit;
    expect(
      pinkyTarget({
        phase: GHOST_PHASE.leaving,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 20,
        playerFacing: GHOST_DIR.right,
        ghostCol: exit.col,
        ghostRow: exit.row + 1,
      }),
    ).toEqual(exit);
  });

  it("uses the NW scatter corner", () => {
    expect(
      pinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        playerCol: 10,
        playerRow: 20,
        playerFacing: GHOST_DIR.right,
      }),
    ).toEqual({ col: PINKY_SCATTER_COL, row: PINKY_SCATTER_ROW });
  });

  it("targets four clean tiles ahead in chase", () => {
    const n = PINKY_LOOKAHEAD_TILES;
    expect(
      pinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 15,
        playerFacing: GHOST_DIR.left,
      }),
    ).toEqual({ col: 10 - n, row: 15 });
    expect(
      pinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 15,
        playerFacing: GHOST_DIR.right,
      }),
    ).toEqual({ col: 10 + n, row: 15 });
    expect(
      pinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 15,
        playerFacing: GHOST_DIR.up,
      }),
    ).toEqual({ col: 10, row: 15 - n });
    expect(
      pinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 15,
        playerFacing: GHOST_DIR.down,
      }),
    ).toEqual({ col: 10, row: 15 + n });
  });

  it("treats none facing as left for look-ahead", () => {
    expect(
      pinkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 12,
        playerRow: 18,
        playerFacing: GHOST_DIR.none,
      }),
    ).toEqual({ col: 12 - PINKY_LOOKAHEAD_TILES, row: 18 });
  });
});

describe("clydeTarget", () => {
  it("targets the house exit while leaving", () => {
    expect(
      clydeTarget({
        phase: GHOST_PHASE.leaving,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 20,
        ghostCol: 13,
        ghostRow: 14,
      }),
    ).toEqual(getActiveLayout().ghostHouseExit);
  });

  it("uses the SW scatter corner in scatter mode", () => {
    expect(
      clydeTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        playerCol: 10,
        playerRow: 20,
        ghostCol: 1,
        ghostRow: 1,
      }),
    ).toEqual({ col: CLYDE_SCATTER_COL, row: CLYDE_SCATTER_ROW });
  });

  it("chases the player when Euclidean distance is at least shy tiles", () => {
    expect(
      clydeTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 10,
        ghostCol: 10 + CLYDE_SHY_TILES,
        ghostRow: 10,
      }),
    ).toEqual({ col: 10, row: 10 });
  });

  it("targets scatter when closer than shy tiles", () => {
    expect(
      clydeTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 10,
        ghostCol: 10 + CLYDE_SHY_TILES - 1,
        ghostRow: 10,
      }),
    ).toEqual({ col: CLYDE_SCATTER_COL, row: CLYDE_SCATTER_ROW });
  });

  it("uses Euclidean distance on diagonals", () => {
    expect(
      clydeTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 10,
        ghostCol: 16,
        ghostRow: 16,
      }),
    ).toEqual({ col: 10, row: 10 });
    expect(
      clydeTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 10,
        ghostCol: 15,
        ghostRow: 16,
      }),
    ).toEqual({ col: CLYDE_SCATTER_COL, row: CLYDE_SCATTER_ROW });
  });
});
