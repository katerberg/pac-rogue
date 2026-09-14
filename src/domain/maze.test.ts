import { describe, expect, it } from "vitest";
import {
  MAZE_COLS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_PIXEL_WIDTH,
  MAZE_ROWS,
  MAZE_SOLIDS,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  TILE_SIZE,
  canEnterDirection,
  cellCenterX,
  cellCenterY,
  clampAgainstFacingWall,
  isExterior,
  isSolid,
  isTunnelMouth,
  isWalkable,
  isWall,
  parseMaze,
  pipeEdges,
  playerSpawnCenter,
  pelletCellCenters,
  solidCellCenters,
  walkableCellCenters,
  wrapPosition,
  wrappedTwinPosition,
} from "./maze";

describe("maze", () => {
  it("parses to 28×31 with narrower opposite-edge safety", () => {
    expect(MAZE_SOLIDS).toHaveLength(MAZE_ROWS);
    expect(MAZE_SOLIDS[0]).toHaveLength(MAZE_COLS);
    expect(TILE_SIZE).toBe(19);
    expect(MAZE_OFFSET_X).toBe(134);
    expect(MAZE_OFFSET_Y).toBe(5);

    expect(isWall(0, 0)).toBe(true);
    expect(isWall(MAZE_COLS - 1, 0)).toBe(true);
    expect(isWalkable(0, 14)).toBe(true);
    expect(isWalkable(MAZE_COLS - 1, 14)).toBe(true);
  });

  it("classifies indent pockets as exterior, not walls", () => {
    expect(isExterior(0, 10)).toBe(true);
    expect(isExterior(1, 10)).toBe(true);
    expect(isWall(0, 10)).toBe(false);
    expect(isWalkable(0, 10)).toBe(false);
    expect(isSolid(0, 10)).toBe(true);
  });

  it("treats paired walkable edge cells as tunnel mouths", () => {
    expect(isTunnelMouth(0, 14)).toBe(true);
    expect(isTunnelMouth(MAZE_COLS - 1, 14)).toBe(true);
    expect(isTunnelMouth(0, 10)).toBe(false);
    expect(canEnterDirection(cellCenterX(0), cellCenterY(14), -1, 0)).toBe(true);
    expect(canEnterDirection(cellCenterX(MAZE_COLS - 1), cellCenterY(14), 1, 0)).toBe(true);
  });

  it("wraps fractional horizontal offset across a tunnel row", () => {
    const y = cellCenterY(14);
    const pastLeft = MAZE_OFFSET_X - 4;
    const wrapped = wrapPosition(pastLeft, y);
    expect(wrapped.y).toBe(y);
    expect(wrapped.x).toBeCloseTo(pastLeft + MAZE_PIXEL_WIDTH, 5);

    const pastRight = MAZE_OFFSET_X + MAZE_PIXEL_WIDTH + 3;
    const wrappedRight = wrapPosition(pastRight, y);
    expect(wrappedRight.x).toBeCloseTo(pastRight - MAZE_PIXEL_WIDTH, 5);
  });

  it("does not wrap on non-tunnel rows", () => {
    const y = cellCenterY(1);
    const pastLeft = MAZE_OFFSET_X - 4;
    const wrapped = wrapPosition(pastLeft, y);
    expect(wrapped.x).toBe(pastLeft);
  });

  it("reports a twin while the sprite straddles a tunnel seam", () => {
    const y = cellCenterY(14);
    const radius = TILE_SIZE / 2;
    const twin = wrappedTwinPosition(MAZE_OFFSET_X + 2, y, radius);
    expect(twin).not.toBeNull();
    expect(twin?.y).toBe(y);
    expect(twin?.x).toBeCloseTo(MAZE_OFFSET_X + 2 + MAZE_PIXEL_WIDTH, 5);

    const interior = wrappedTwinPosition(cellCenterX(6), y, radius);
    expect(interior).toBeNull();
  });

  it("exposes top/bottom tunnel helpers even when unused by the ASCII", () => {
    expect(isTunnelMouth(13, 0)).toBe(false);
    expect(isTunnelMouth(13, MAZE_ROWS - 1)).toBe(false);
  });

  it("treats # and - as walls and keeps corridors walkable", () => {
    expect(isSolid(1, 1)).toBe(false);
    expect(isWalkable(1, 1)).toBe(true);
    expect(isSolid(2, 2)).toBe(true);
    expect(isWall(2, 2)).toBe(true);
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

  it("lists wall centers and pipe edges without treating exterior as walls", () => {
    const centers = solidCellCenters();
    expect(centers.length).toBe(498);
    expect(centers.every((c) => isWall(c.col, c.row))).toBe(true);
    expect(centers.every((c) => !isExterior(c.col, c.row))).toBe(true);

    const edges = pipeEdges();
    expect(edges.length).toBeGreaterThan(0);
  });

  it("lists walkable centers for the playable flood only", () => {
    const centers = walkableCellCenters();
    expect(centers.length).toBe(300);
    expect(centers.every((c) => isWalkable(c.col, c.row))).toBe(true);
    expect(centers.length + solidCellCenters().length).toBeLessThan(MAZE_COLS * MAZE_ROWS);
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

  it("does not clamp against a tunnel exit", () => {
    const x = cellCenterX(0) - 5;
    const y = cellCenterY(14);
    const clamped = clampAgainstFacingWall(x, y, -1, 0);
    expect(clamped.x).toBe(x);
  });
});
