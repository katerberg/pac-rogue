import { describe, expect, it } from "vitest";
import {
  CLYDE_SHY_TILES,
  INKY_LOOKAHEAD_TILES,
  PINKY_LOOKAHEAD_TILES,
  blinkyScatterTarget,
  blinkyTarget,
  clydeScatterTarget,
  clydeTarget,
  inkyScatterTarget,
  inkyTarget,
  pinkyScatterTarget,
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
    ).toEqual(blinkyScatterTarget());
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
    ).toEqual(blinkyScatterTarget());
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
    ).toEqual(pinkyScatterTarget());
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
    ).toEqual(clydeScatterTarget());
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
    ).toEqual(clydeScatterTarget());
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
    ).toEqual(clydeScatterTarget());
  });
});

describe("inkyTarget", () => {
  it("targets the house exit while leaving on the door column", () => {
    const exit = getActiveLayout().ghostHouseExit;
    expect(
      inkyTarget({
        phase: GHOST_PHASE.leaving,
        mode: GHOST_AI_MODE.chase,
        playerCol: 10,
        playerRow: 20,
        playerFacing: GHOST_DIR.right,
        blinkyCol: 5,
        blinkyRow: 5,
        ghostCol: exit.col,
        ghostRow: exit.row + 1,
      }),
    ).toEqual(exit);
  });

  it("uses the SE scatter corner", () => {
    expect(
      inkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.scatter,
        playerCol: 10,
        playerRow: 20,
        playerFacing: GHOST_DIR.right,
        blinkyCol: 5,
        blinkyRow: 5,
      }),
    ).toEqual(inkyScatterTarget());
  });

  it("doubles the vector from Blinky through a clean two-tile pivot", () => {
    const n = INKY_LOOKAHEAD_TILES;
    const blinkyCol = 8;
    const blinkyRow = 12;
    const playerCol = 10;
    const playerRow = 15;

    expect(
      inkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol,
        playerRow,
        playerFacing: GHOST_DIR.right,
        blinkyCol,
        blinkyRow,
      }),
    ).toEqual({ col: 2 * (playerCol + n) - blinkyCol, row: 2 * playerRow - blinkyRow });

    expect(
      inkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol,
        playerRow,
        playerFacing: GHOST_DIR.left,
        blinkyCol,
        blinkyRow,
      }),
    ).toEqual({ col: 2 * (playerCol - n) - blinkyCol, row: 2 * playerRow - blinkyRow });

    expect(
      inkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol,
        playerRow,
        playerFacing: GHOST_DIR.up,
        blinkyCol,
        blinkyRow,
      }),
    ).toEqual({ col: 2 * playerCol - blinkyCol, row: 2 * (playerRow - n) - blinkyRow });

    expect(
      inkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol,
        playerRow,
        playerFacing: GHOST_DIR.down,
        blinkyCol,
        blinkyRow,
      }),
    ).toEqual({ col: 2 * playerCol - blinkyCol, row: 2 * (playerRow + n) - blinkyRow });
  });

  it("treats none facing as left for the pivot", () => {
    expect(
      inkyTarget({
        phase: GHOST_PHASE.active,
        mode: GHOST_AI_MODE.chase,
        playerCol: 12,
        playerRow: 18,
        playerFacing: GHOST_DIR.none,
        blinkyCol: 4,
        blinkyRow: 10,
      }),
    ).toEqual({
      col: 2 * (12 - INKY_LOOKAHEAD_TILES) - 4,
      row: 2 * 18 - 10,
    });
  });
});
