import { describe, expect, it } from "vitest";
import {
  MAZE_COLS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_ROWS,
  MAZE_SOLIDS,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  TILE_SIZE,
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  clampAgainstFacingWall,
  isSolid,
  isWalkable,
  parseMaze,
  pipeEdges,
  playerSpawnCenter,
  pelletCellCenters,
  solidCellCenters,
  walkableCellCenters,
} from "./maze";

describe("maze", () => {
  it("parses to 28×31 with forced solid edge columns", () => {
    expect(MAZE_SOLIDS).toHaveLength(MAZE_ROWS);
    expect(MAZE_SOLIDS[0]).toHaveLength(MAZE_COLS);
    expect(TILE_SIZE).toBe(19);
    expect(MAZE_OFFSET_X).toBe(134);
    expect(MAZE_OFFSET_Y).toBe(5);

    for (let row = 0; row < MAZE_ROWS; row += 1) {
      expect(isSolid(0, row)).toBe(true);
      expect(isSolid(MAZE_COLS - 1, row)).toBe(true);
    }
  });

  it("treats # and - as solid and . @ space as walkable", () => {
    expect(isSolid(1, 1)).toBe(false);
    expect(isWalkable(1, 1)).toBe(true);
    expect(isSolid(2, 2)).toBe(true);
    expect(isSolid(13, 12)).toBe(true);
    expect(isWalkable(11, 11)).toBe(true);
  });

  it("keeps the locked spawn cell open", () => {
    expect(isWalkable(PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW)).toBe(true);
    const spawn = playerSpawnCenter();
    expect(spawn.x).toBe(cellCenterX(PLAYER_SPAWN_COL));
    expect(spawn.y).toBe(cellCenterY(PLAYER_SPAWN_ROW));
  });

  it("rejects malformed ASCII", () => {
    expect(() => parseMaze("#\n")).toThrow(/rows/);
  });

  it("lists solid centers and pipe edges", () => {
    const centers = solidCellCenters();
    expect(centers.length).toBeGreaterThan(100);
    expect(centers.every((c) => isSolid(c.col, c.row))).toBe(true);

    const edges = pipeEdges();
    expect(edges.length).toBeGreaterThan(0);
  });

  it("lists walkable centers for every non-solid cell", () => {
    const centers = walkableCellCenters();
    expect(centers.length).toBe(356);
    expect(centers.every((c) => isWalkable(c.col, c.row))).toBe(true);
    expect(centers.length + solidCellCenters().length).toBe(MAZE_COLS * MAZE_ROWS);
  });

  it("lists pellet centers only for . and @ cells", () => {
    const pellets = pelletCellCenters();
    expect(pellets.length).toBe(244);
    expect(pellets.every((c) => isWalkable(c.col, c.row))).toBe(true);
    expect(pellets.length).toBeLessThan(walkableCellCenters().length);
  });

  it("reports enterable neighbors from a corridor cell", () => {
    const x = cellCenterX(1);
    const y = cellCenterY(1);
    expect(canEnterDirection(x, y, 1, 0)).toBe(true);
    expect(canEnterDirection(x, y, 0, -1)).toBe(false);
  });

  it("clamps facing-wall overshoot back to the open cell center", () => {
    const x = cellCenterX(1);
    const openY = cellCenterY(1);
    const overshot = clampAgainstFacingWall(x, cellCenterY(0), 0, -1);
    expect(overshot.x).toBe(x);
    expect(overshot.y).toBe(openY);
  });
});
