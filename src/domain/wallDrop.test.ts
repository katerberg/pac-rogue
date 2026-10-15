import { describe, expect, it } from "vitest";
import { EXPIRY_BLINK_MS } from "./expiryBlink";
import { getActiveLayout, isWalkable, MAZE_COLS } from "./maze";
import {
  PASSABLE_WALL_ALPHA,
  droppedWallAlpha,
  wallDropCell,
  withSolidCell,
  type CardinalStep,
} from "./wallDrop";

const RIGHT: CardinalStep = { dx: 1, dy: 0 };
const LEFT: CardinalStep = { dx: -1, dy: 0 };
const UP: CardinalStep = { dx: 0, dy: -1 };

function corridorCellWithOpenRight(): { col: number; row: number } {
  const layout = getActiveLayout();
  for (let row = 1; row < layout.rows - 1; row += 1) {
    for (let col = 1; col < layout.cols - 2; col += 1) {
      if (
        isWalkable(col, row) &&
        isWalkable(col + 1, row) &&
        wallDropCell(col, row, RIGHT, LEFT) !== null
      ) {
        return { col, row };
      }
    }
  }
  throw new Error("no corridor");
}

describe("wallDropCell", () => {
  it("drops on the tile ahead of the old heading after an exact reversal", () => {
    const { col, row } = corridorCellWithOpenRight();
    expect(wallDropCell(col, row, RIGHT, LEFT)).toEqual({ col: col + 1, row });
  });

  it("ignores turns, stops and starts", () => {
    const { col, row } = corridorCellWithOpenRight();
    expect(wallDropCell(col, row, RIGHT, UP)).toBeNull();
    expect(wallDropCell(col, row, RIGHT, RIGHT)).toBeNull();
    expect(wallDropCell(col, row, undefined, LEFT)).toBeNull();
    expect(wallDropCell(col, row, RIGHT, undefined)).toBeNull();
  });

  it("never drops into a maze wall, off the board, or on the ghost house exit", () => {
    const layout = getActiveLayout();
    expect(wallDropCell(0, 0, LEFT, RIGHT)).toBeNull();
    expect(wallDropCell(MAZE_COLS - 1, 0, RIGHT, LEFT)).toBeNull();
    const exit = layout.ghostHouseExit;
    expect(wallDropCell(exit.col - 1, exit.row, RIGHT, LEFT)).toBeNull();
    expect(wallDropCell(exit.col + 1, exit.row, LEFT, RIGHT)).toBeNull();
  });
});

describe("withSolidCell", () => {
  it("marks one cell solid without touching the source grid", () => {
    const grid = [
      [false, false],
      [false, true],
    ];
    const out = withSolidCell(grid, { col: 1, row: 0 });
    expect(out).toEqual([
      [false, true],
      [false, true],
    ]);
    expect(grid[0]).toEqual([false, false]);
    expect(withSolidCell(grid, null)).toBe(grid);
  });
});

describe("droppedWallAlpha", () => {
  const wall = { col: 0, row: 0, passable: false };

  it("is solid until the last second, then blinks", () => {
    expect(droppedWallAlpha({ ...wall, remainingMs: 5000 }, EXPIRY_BLINK_MS)).toBe(1);
    expect(droppedWallAlpha({ ...wall, remainingMs: 500 }, 0)).toBe(1);
    expect(droppedWallAlpha({ ...wall, remainingMs: 500 }, EXPIRY_BLINK_MS)).toBe(0);
  });

  it("draws a passable wall see-through", () => {
    expect(
      droppedWallAlpha({ ...wall, passable: true, remainingMs: Number.POSITIVE_INFINITY }, 0),
    ).toBe(PASSABLE_WALL_ALPHA);
  });
});
