import { describe, expect, it } from "vitest";
import { getActiveLayout, isWalkable, MAZE_COLS } from "./maze";
import {
  DROPPED_WALL_COLOR,
  PASSABLE_WALL_ALPHA,
  WALL_DROP_BLINK_PERIOD_MS,
  WALL_DROP_BLINK_WINDOW_MS,
  droppedWallLook,
  ghostStepBlockedByWall,
  wallDropSpot,
  withSolidCell,
  type CardinalStep,
  type DroppedWall,
} from "./wallDrop";

const RIGHT: CardinalStep = { dx: 1, dy: 0 };
const LEFT: CardinalStep = { dx: -1, dy: 0 };
const UP: CardinalStep = { dx: 0, dy: -1 };

function corridorCell(): { col: number; row: number } {
  const layout = getActiveLayout();
  for (let row = 1; row < layout.rows - 1; row += 1) {
    for (let col = 1; col < layout.cols - 1; col += 1) {
      if (isWalkable(col, row) && wallDropSpot(col, row, RIGHT, LEFT) !== null) {
        return { col, row };
      }
    }
  }
  throw new Error("no corridor");
}

describe("wallDropSpot", () => {
  it("drops on the tile where Dot-Man reversed, facing away along his new heading", () => {
    const { col, row } = corridorCell();
    expect(wallDropSpot(col, row, RIGHT, LEFT)).toEqual({ col, row, awayStep: LEFT });
  });

  it("ignores turns, stops and starts", () => {
    const { col, row } = corridorCell();
    expect(wallDropSpot(col, row, RIGHT, UP)).toBeNull();
    expect(wallDropSpot(col, row, RIGHT, RIGHT)).toBeNull();
    expect(wallDropSpot(col, row, undefined, LEFT)).toBeNull();
    expect(wallDropSpot(col, row, RIGHT, undefined)).toBeNull();
  });

  it("never drops on a maze wall, off the board, or on the ghost house exit", () => {
    const exit = getActiveLayout().ghostHouseExit;
    expect(wallDropSpot(0, 0, LEFT, RIGHT)).toBeNull();
    expect(wallDropSpot(MAZE_COLS, 1, RIGHT, LEFT)).toBeNull();
    expect(wallDropSpot(exit.col, exit.row, RIGHT, LEFT)).toBeNull();
  });
});

describe("ghostStepBlockedByWall", () => {
  const wall: DroppedWall = {
    col: 5,
    row: 7,
    awayStep: LEFT,
    remainingMs: 1000,
    passable: false,
    vacated: false,
  };

  it("keeps ghosts from entering the wall tile from any side", () => {
    expect(ghostStepBlockedByWall(wall, 6, 7, -1, 0)).toBe(true);
    expect(ghostStepBlockedByWall(wall, 4, 7, 1, 0)).toBe(true);
    expect(ghostStepBlockedByWall(wall, 5, 6, 0, 1)).toBe(true);
  });

  it("lets a ghost on the wall tile leave, but never toward Dot-Man", () => {
    expect(ghostStepBlockedByWall(wall, 5, 7, -1, 0)).toBe(true);
    expect(ghostStepBlockedByWall(wall, 5, 7, 1, 0)).toBe(false);
    expect(ghostStepBlockedByWall(wall, 5, 7, 0, -1)).toBe(false);
  });

  it("blocks nothing elsewhere or without a wall", () => {
    expect(ghostStepBlockedByWall(wall, 9, 9, -1, 0)).toBe(false);
    expect(ghostStepBlockedByWall(null, 6, 7, -1, 0)).toBe(false);
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

describe("droppedWallLook", () => {
  const wall: DroppedWall = {
    col: 0,
    row: 0,
    awayStep: LEFT,
    remainingMs: 5000,
    passable: false,
    vacated: false,
  };
  const alpha = (remainingMs: number, nowMs: number) =>
    droppedWallLook({ ...wall, remainingMs }, nowMs, 4).alpha;

  it("is a Dot-Man-yellow, Dot-Man-sized outline with the maze's corner radius", () => {
    expect(droppedWallLook(wall, 0, 4, 20)).toEqual({
      color: DROPPED_WALL_COLOR,
      alpha: 1,
      size: 20,
      cornerRadius: 4,
    });
    expect(droppedWallLook(wall, 0, 30, 20).cornerRadius).toBe(10);
  });

  it("stays solid, then blinks for its last two seconds", () => {
    const offPhase = WALL_DROP_BLINK_PERIOD_MS;
    expect(alpha(WALL_DROP_BLINK_WINDOW_MS + 1, offPhase)).toBe(1);
    expect(alpha(WALL_DROP_BLINK_WINDOW_MS, 0)).toBe(1);
    expect(alpha(WALL_DROP_BLINK_WINDOW_MS, offPhase)).toBe(0);
    expect(alpha(100, offPhase * 2)).toBe(1);
  });

  it("draws a passable wall see-through", () => {
    const look = droppedWallLook(
      { ...wall, passable: true, remainingMs: Number.POSITIVE_INFINITY },
      0,
      4,
    );
    expect(look.alpha).toBe(PASSABLE_WALL_ALPHA);
  });
});
