import { describe, expect, it } from "vitest";
import {
  MAZE_COLS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_PIXEL_WIDTH,
  MAZE_ROWS,
  MAZE_SOLIDS,
  MAZE_WALLS,
  GHOST_HOUSE_EXIT_COL,
  GHOST_HOUSE_EXIT_ROW,
  PLAYER_SPAWN_COL,
  PLAYER_SPAWN_ROW,
  TILE_SIZE,
  buildExterior,
  canEnterDirection,
  canGhostEnterDirection,
  cellCenterX,
  cellCenterY,
  cellOriginX,
  cellOriginY,
  clampAgainstFacingWall,
  doorGateEdges,
  ghostSolidsForPhase,
  hasLeftGhostHouse,
  isDoor,
  isExterior,
  isGhostWalkable,
  isHouse,
  isSolid,
  isTunnelMouth,
  isWalkable,
  isWall,
  parseMaze,
  pipeEdges,
  playerDisplaySize,
  playerSpawnCenter,
  pelletCellCenters,
  PLAYER_WALL_PADDING_PX,
  WALL_CORNER_RADIUS,
  clampedWallCornerRadius,
  wallCellCenters,
  wallFillRects,
  wallPathCommands,
  walkableCellCenters,
  wrapPosition,
  wrappedTwinPosition,
} from "./maze";
import { GHOST_PHASE } from "./ghostTarget";

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

  it("requires wrap before clamp so tunnel exit past the seam is not snapped back", () => {
    const y = cellCenterY(14);
    const pastLeft = MAZE_OFFSET_X - 4;
    const pastRight = MAZE_OFFSET_X + MAZE_PIXEL_WIDTH + 3;

    expect(clampAgainstFacingWall(pastLeft, y, -1, 0).x).toBe(cellCenterX(0));
    expect(clampAgainstFacingWall(pastRight, y, 1, 0).x).toBe(cellCenterX(MAZE_COLS - 1));

    const wrappedLeft = wrapPosition(pastLeft, y);
    const afterLeft = clampAgainstFacingWall(wrappedLeft.x, wrappedLeft.y, -1, 0);
    expect(afterLeft.x).toBeCloseTo(wrappedLeft.x, 5);
    expect(afterLeft.x).toBeGreaterThan(cellCenterX(MAZE_COLS - 2));

    const wrappedRight = wrapPosition(pastRight, y);
    const afterRight = clampAgainstFacingWall(wrappedRight.x, wrappedRight.y, 1, 0);
    expect(afterRight.x).toBeCloseTo(wrappedRight.x, 5);
    expect(afterRight.x).toBeLessThan(cellCenterX(1));
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

  it("treats # as walls and keeps corridors walkable", () => {
    expect(isSolid(1, 1)).toBe(false);
    expect(isWalkable(1, 1)).toBe(true);
    expect(isSolid(2, 2)).toBe(true);
    expect(isWall(2, 2)).toBe(true);
    expect(isSolid(13, 12)).toBe(true);
    expect(isWall(13, 12)).toBe(false);
    expect(isWalkable(11, 11)).toBe(true);
  });

  it("carves a ghost house walkable for ghosts but blocked for the player", () => {
    expect(isHouse(13, 12)).toBe(true);
    expect(isHouse(13, 14)).toBe(true);
    expect(isGhostWalkable(13, 12)).toBe(true);
    expect(isGhostWalkable(13, 14)).toBe(true);
    expect(isWalkable(13, 12)).toBe(false);
    expect(isWalkable(13, 14)).toBe(false);
    expect(isWalkable(GHOST_HOUSE_EXIT_COL, GHOST_HOUSE_EXIT_ROW)).toBe(true);
    expect(isGhostWalkable(GHOST_HOUSE_EXIT_COL, GHOST_HOUSE_EXIT_ROW)).toBe(true);
  });

  it("marks the middle house door tiles and draws one gate edge across them", () => {
    expect(isDoor(13, 12)).toBe(true);
    expect(isDoor(14, 12)).toBe(true);
    expect(isDoor(12, 12)).toBe(false);
    expect(isDoor(13, 11)).toBe(false);
    const gates = doorGateEdges();
    expect(gates).toHaveLength(1);
    expect(gates[0]!.x1).toBe(cellOriginX(13));
    expect(gates[0]!.x2).toBe(cellOriginX(14) + TILE_SIZE);
  });

  it("treats the exit corridor as outside the house", () => {
    expect(hasLeftGhostHouse(13, 14)).toBe(false);
    expect(hasLeftGhostHouse(13, 12)).toBe(false);
    expect(hasLeftGhostHouse(GHOST_HOUSE_EXIT_COL, GHOST_HOUSE_EXIT_ROW)).toBe(true);
    expect(hasLeftGhostHouse(12, GHOST_HOUSE_EXIT_ROW)).toBe(true);
  });

  it("allows leaving ghosts up through the door but blocks re-entry once active", () => {
    const doorX = cellCenterX(13);
    const doorY = cellCenterY(12);
    const exitX = cellCenterX(GHOST_HOUSE_EXIT_COL);
    const exitY = cellCenterY(GHOST_HOUSE_EXIT_ROW);

    expect(canGhostEnterDirection(doorX, doorY, 0, -1, GHOST_PHASE.leaving)).toBe(true);
    expect(canGhostEnterDirection(exitX, exitY, 0, 1, GHOST_PHASE.leaving)).toBe(false);
    expect(canGhostEnterDirection(exitX, exitY, 0, 1, GHOST_PHASE.active)).toBe(false);
    expect(isGhostWalkable(13, 14, ghostSolidsForPhase(GHOST_PHASE.leaving))).toBe(true);
    expect(isGhostWalkable(13, 14, ghostSolidsForPhase(GHOST_PHASE.active))).toBe(false);
    expect(isGhostWalkable(13, 12, ghostSolidsForPhase(GHOST_PHASE.active))).toBe(false);
  });

  it("spawns in the lowest empty center cell", () => {
    expect(PLAYER_SPAWN_COL).toBe(13);
    expect(PLAYER_SPAWN_ROW).toBe(23);
    expect(isWalkable(PLAYER_SPAWN_COL, PLAYER_SPAWN_ROW)).toBe(true);
    const spawn = playerSpawnCenter();
    expect(spawn.x).toBe(cellCenterX(PLAYER_SPAWN_COL));
    expect(spawn.y).toBe(cellCenterY(PLAYER_SPAWN_ROW));
  });

  it("rejects malformed ASCII", () => {
    expect(() => parseMaze("#\n")).toThrow(/rows/);
  });

  it("lists wall centers and pipe edges without treating exterior as walls", () => {
    const centers = wallCellCenters();
    expect(centers.length).toBe(478);
    expect(centers.every((c) => isWall(c.col, c.row))).toBe(true);
    expect(centers.every((c) => !isExterior(c.col, c.row))).toBe(true);

    const edges = pipeEdges();
    expect(edges.length).toBeGreaterThan(0);
  });

  it("does not outline exterior voids that touch the outer map edge", () => {
    const edges = pipeEdges();
    const left = cellOriginX(0);
    const top = cellOriginY(13);

    const outlinesExteriorAboveTunnelStub = edges.some(
      (edge) =>
        edge.y1 === top && edge.y2 === top && edge.x1 >= left && edge.x2 <= left + TILE_SIZE * 6,
    );
    expect(outlinesExteriorAboveTunnelStub).toBe(false);

    expect(isExterior(0, 12)).toBe(true);
    expect(isWall(0, 13)).toBe(true);
  });

  it("lists walkable centers for the playable flood only", () => {
    const centers = walkableCellCenters();
    expect(centers.length).toBe(300);
    expect(centers.every((c) => isWalkable(c.col, c.row))).toBe(true);
    expect(centers.length + wallCellCenters().length).toBeLessThan(MAZE_COLS * MAZE_ROWS);
  });

  it("lists pellet centers only for . and @ cells", () => {
    const pellets = pelletCellCenters();
    expect(pellets.length).toBe(244);
    expect(pellets.every((c) => isWalkable(c.col, c.row))).toBe(true);
    expect(pellets.length).toBeLessThan(walkableCellCenters().length);
    expect(pellets.filter((c) => c.kind === "power")).toHaveLength(4);
    expect(pellets.every((c) => c.kind === "dot" || c.kind === "power")).toBe(true);
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

  it("fails fast when exterior flood finds no playable cells from spawn", () => {
    const walls = parseMaze().map((row) => [...row]);
    walls[PLAYER_SPAWN_ROW]![PLAYER_SPAWN_COL] = true;
    expect(() => buildExterior(walls)).toThrow(/no playable cells from spawn/);
  });

  it("clamps out-of-bounds samples before tunnel mouth enter checks", () => {
    const y = cellCenterY(14);
    expect(canEnterDirection(MAZE_OFFSET_X - 1, y, -1, 0)).toBe(true);
    expect(canEnterDirection(MAZE_OFFSET_X + MAZE_PIXEL_WIDTH + 1, y, 1, 0)).toBe(true);
  });

  it("accepts injectable exterior grids for pipe edge rules", () => {
    const emptyExterior = Array.from({ length: MAZE_ROWS }, () =>
      Array.from({ length: MAZE_COLS }, () => false),
    );
    const withDefault = pipeEdges();
    const withEmptyExterior = pipeEdges(MAZE_WALLS, emptyExterior);
    expect(withEmptyExterior.length).toBeGreaterThan(withDefault.length);
  });

  it("derives player display size from wall padding", () => {
    expect(playerDisplaySize()).toBe(TILE_SIZE - 2 * PLAYER_WALL_PADDING_PX);
    expect(playerDisplaySize(4, 19)).toBe(11);
  });

  it("clamps wall corner radius to a half tile", () => {
    expect(clampedWallCornerRadius(WALL_CORNER_RADIUS)).toBe(WALL_CORNER_RADIUS);
    expect(clampedWallCornerRadius(TILE_SIZE)).toBe(TILE_SIZE / 2);
    expect(clampedWallCornerRadius(-3)).toBe(0);
  });

  it("builds wall fill rects for wall cells only", () => {
    const rects = wallFillRects();
    expect(rects.length).toBe(wallCellCenters().length);
    expect(rects.every((rect) => rect.width === TILE_SIZE && rect.height === TILE_SIZE)).toBe(true);
  });

  it("emits rounded wall path commands and skips exterior faces", () => {
    const commands = wallPathCommands();
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.some((command) => command.type === "line")).toBe(true);
    expect(commands.some((command) => command.type === "move")).toBe(true);

    const left = cellOriginX(0);
    const top = cellOriginY(13);
    const outlinesExteriorAboveTunnelStub = commands.some((command, index) => {
      if (command.type !== "line") {
        return false;
      }
      const prev = commands[index - 1];
      if (!prev || prev.type !== "move") {
        return false;
      }
      return (
        prev.y === top && command.y === top && prev.x >= left && command.x <= left + TILE_SIZE * 6
      );
    });
    expect(outlinesExteriorAboveTunnelStub).toBe(false);
  });

  it("includes convex corner polylines at a known corridor corner", () => {
    const commands = wallPathCommands();
    const radius = clampedWallCornerRadius();
    const cornerX = cellOriginX(2);
    const cornerY = cellOriginY(2);
    const start = { x: cornerX + radius, y: cornerY };
    const end = { x: cornerX, y: cornerY + radius };
    const mid = {
      x: cornerX + 0.25 * radius,
      y: cornerY + 0.25 * radius,
    };

    const hasStart = commands.some(
      (command) =>
        command.type === "move" &&
        Math.abs(command.x - start.x) < 0.01 &&
        Math.abs(command.y - start.y) < 0.01,
    );
    const hasEnd = commands.some(
      (command) =>
        command.type === "line" &&
        Math.abs(command.x - end.x) < 0.01 &&
        Math.abs(command.y - end.y) < 0.01,
    );
    const hasMid = commands.some(
      (command) =>
        command.type === "line" &&
        Math.abs(command.x - mid.x) < 0.75 &&
        Math.abs(command.y - mid.y) < 0.75,
    );
    expect(hasStart).toBe(true);
    expect(hasEnd).toBe(true);
    expect(hasMid).toBe(true);
  });
});
