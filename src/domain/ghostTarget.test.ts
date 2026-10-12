import { describe, expect, it } from "vitest";
import {
  CLYDE_SHY_TILES,
  SPUNKY_AGGRO_TILES,
  spunkyPostTarget,
  spunkyTarget,
  WARDY_STRIKE_TILES,
  rimDistance,
  wardyRimTile,
  wardyScatterTarget,
  wardyTarget,
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
import { GHOST_AI_MODE, type GhostAiMode } from "./ghostMode";
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

describe("spunkyTarget", () => {
  const post = spunkyPostTarget();
  const args = (ghostCol: number, mode: GhostAiMode = GHOST_AI_MODE.chase) => ({
    phase: GHOST_PHASE.active,
    mode,
    playerCol: 10,
    playerRow: 10,
    ghostCol,
    ghostRow: 10,
  });

  it("chases Maze-Man once he is within the aggro radius", () => {
    expect(spunkyTarget(args(10 + SPUNKY_AGGRO_TILES))).toEqual({ col: 10, row: 10 });
  });

  it("returns to its post while Maze-Man is farther than the aggro radius", () => {
    expect(spunkyTarget(args(10 + SPUNKY_AGGRO_TILES + 1))).toEqual(post);
  });

  it("holds its post in scatter even when Maze-Man is adjacent", () => {
    expect(spunkyTarget(args(11, GHOST_AI_MODE.scatter))).toEqual(post);
  });

  it("posts at the top-center above the maze", () => {
    expect(post).toEqual({ col: Math.floor(getActiveLayout().cols / 2), row: -3 });
  });

  it("walks out through the door column while leaving", () => {
    const exit = getActiveLayout().ghostHouseExit;
    expect(
      spunkyTarget({ ...args(exit.col), phase: GHOST_PHASE.leaving, ghostRow: exit.row + 1 }),
    ).toEqual(exit);
  });
});

describe("wardyRimTile", () => {
  const board = { cols: 28, rows: 34 };

  it("projects Maze-Man's facing to the rim at his own row or column", () => {
    const at = (playerFacing: (typeof GHOST_DIR)[keyof typeof GHOST_DIR]) =>
      wardyRimTile({ playerCol: 12, playerRow: 15, playerFacing, ...board });
    expect(at(GHOST_DIR.up)).toEqual({ col: 12, row: 0 });
    expect(at(GHOST_DIR.down)).toEqual({ col: 12, row: 33 });
    expect(at(GHOST_DIR.left)).toEqual({ col: 0, row: 15 });
    expect(at(GHOST_DIR.right)).toEqual({ col: 27, row: 15 });
  });

  it("uses the nearest edge when Maze-Man has no facing", () => {
    expect(
      wardyRimTile({ playerCol: 20, playerRow: 15, playerFacing: GHOST_DIR.none, ...board }),
    ).toEqual({ col: 27, row: 15 });
    expect(
      wardyRimTile({ playerCol: 12, playerRow: 3, playerFacing: GHOST_DIR.none, ...board }),
    ).toEqual({ col: 12, row: 0 });
  });
});

describe("wardyTarget", () => {
  const { cols, rows } = getActiveLayout();
  const mid = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
  const args = (over: Partial<Parameters<typeof wardyTarget>[0]> = {}) => ({
    phase: GHOST_PHASE.active,
    mode: GHOST_AI_MODE.chase,
    playerCol: mid.col,
    playerRow: mid.row,
    playerFacing: GHOST_DIR.right,
    ghostCol: 1,
    ghostRow: 1,
    ...over,
  });

  it("waits on the rim in front of Maze-Man while he is deep in the board", () => {
    expect(rimDistance(mid.col, mid.row)).toBeGreaterThan(WARDY_STRIKE_TILES - 1);
    expect(wardyTarget(args())).toEqual({ col: cols - 1, row: mid.row });
  });

  it("strikes Maze-Man directly once he is within the strike range of any edge", () => {
    const col = WARDY_STRIKE_TILES;
    expect(wardyTarget(args({ playerCol: col, playerRow: mid.row }))).toEqual({
      col,
      row: mid.row,
    });
    expect(wardyTarget(args({ playerCol: col + 1, playerRow: mid.row }))).toEqual({
      col: cols - 1,
      row: mid.row,
    });
  });

  it("goes to the bottom-center scatter point in scatter mode", () => {
    expect(wardyTarget(args({ mode: GHOST_AI_MODE.scatter }))).toEqual(wardyScatterTarget());
    expect(wardyScatterTarget()).toEqual({ col: Math.floor(cols / 2), row: rows + 2 });
  });

  it("walks out through the door column while leaving", () => {
    const exit = getActiveLayout().ghostHouseExit;
    expect(
      wardyTarget(args({ phase: GHOST_PHASE.leaving, ghostCol: exit.col, ghostRow: exit.row + 1 })),
    ).toEqual(exit);
  });
});
