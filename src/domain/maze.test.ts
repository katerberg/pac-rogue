import { describe, expect, it } from "vitest";
import {
  getActiveLayout,
  MAZE_COLS,
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_PIXEL_WIDTH,
  MAZE_TOP_MARGIN_PX,
  MAZE_ROWS,
  TILE_SIZE,
  buildExterior,
  canEnterDirection,
  canGhostEnterDirection,
  cellCenterX,
  cellCenterY,
  cellOriginX,
  cellOriginY,
  clampAgainstFacingWall,
  computeMazeGeometry,
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
  nearestWalkableCellCenter,
  parseMaze,
  pipeEdges,
  playerDisplaySize,
  playerSpawnCenter,
  playerTopCenterCell,
  playerTopCenterSpawn,
  pelletCellCenters,
  PLAYER_WALL_PADDING_PX,
  WALL_CORNER_RADIUS,
  WALL_CORNER_CURVE_MIN_STEPS,
  WALL_CORNER_CURVE_KIND,
  WALL_INSET_PX,
  clampedWallCornerRadius,
  clampedWallInset,
  wallCellCenters,
  wallPathCommands,
  walkableCellCenters,
  wrapPosition,
  wrappedTwinPosition,
  worldToCol,
  worldToRow,
} from "./maze";
import { GHOST_PHASE } from "./ghostTarget";

describe("maze", () => {
  it("parses to 28×31 with narrower opposite-edge safety", () => {
    expect(getActiveLayout().playerSolids).toHaveLength(MAZE_ROWS);
    expect(getActiveLayout().playerSolids[0]).toHaveLength(MAZE_COLS);
    expect(TILE_SIZE).toBe(
      Math.floor(Math.min(800 / MAZE_COLS, Math.max(1, 600 - MAZE_TOP_MARGIN_PX) / MAZE_ROWS)),
    );
    expect(MAZE_OFFSET_X).toBe((800 - MAZE_PIXEL_WIDTH) / 2);
    expect(MAZE_OFFSET_Y).toBe(
      MAZE_TOP_MARGIN_PX + Math.floor((600 - MAZE_TOP_MARGIN_PX - MAZE_ROWS * TILE_SIZE) / 2),
    );
    expect(MAZE_OFFSET_Y).toBeGreaterThanOrEqual(MAZE_TOP_MARGIN_PX);
    expect(MAZE_OFFSET_X).toBeGreaterThanOrEqual(80);
    expect(getActiveLayout().cols).toBe(28);
    expect(getActiveLayout().rows).toBe(31);

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
    const exit = getActiveLayout().ghostHouseExit;
    expect(isWalkable(exit.col, exit.row)).toBe(true);
    expect(isGhostWalkable(exit.col, exit.row)).toBe(true);
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
    const exit = getActiveLayout().ghostHouseExit;
    expect(hasLeftGhostHouse(13, 14)).toBe(false);
    expect(hasLeftGhostHouse(13, 12)).toBe(false);
    expect(hasLeftGhostHouse(exit.col, exit.row)).toBe(true);
    expect(hasLeftGhostHouse(12, exit.row)).toBe(true);
  });

  it("allows leaving ghosts up through the door but blocks re-entry once active", () => {
    const doorX = cellCenterX(13);
    const doorY = cellCenterY(12);
    const exit = getActiveLayout().ghostHouseExit;
    const exitX = cellCenterX(exit.col);
    const exitY = cellCenterY(exit.row);

    expect(canGhostEnterDirection(doorX, doorY, 0, -1, GHOST_PHASE.leaving)).toBe(true);
    expect(canGhostEnterDirection(exitX, exitY, 0, 1, GHOST_PHASE.leaving)).toBe(false);
    expect(canGhostEnterDirection(exitX, exitY, 0, 1, GHOST_PHASE.active)).toBe(false);
    expect(isGhostWalkable(13, 14, ghostSolidsForPhase(GHOST_PHASE.leaving))).toBe(true);
    expect(isGhostWalkable(13, 14, ghostSolidsForPhase(GHOST_PHASE.active))).toBe(false);
    expect(isGhostWalkable(13, 12, ghostSolidsForPhase(GHOST_PHASE.active))).toBe(false);
  });

  it("spawns in the lowest empty center cell", () => {
    const { playerSpawn } = getActiveLayout();
    expect(playerSpawn.col).toBe(13);
    expect(playerSpawn.row).toBe(23);
    expect(isWalkable(playerSpawn.col, playerSpawn.row)).toBe(true);
    const spawn = playerSpawnCenter();
    expect(spawn.x).toBe(cellCenterX(playerSpawn.col));
    expect(spawn.y).toBe(cellCenterY(playerSpawn.row));
  });

  it("picks the walkable cell closest to top-middle without hardcoding tiles", () => {
    const cell = playerTopCenterCell();
    expect(isWalkable(cell.col, cell.row, getActiveLayout().playerSolids)).toBe(true);
    expect(cell.row).toBe(1);
    expect(cell.col).toBe(12);

    const spawn = playerTopCenterSpawn();
    expect(spawn.x).toBe(cellCenterX(12));
    expect(spawn.y).toBe(cellCenterY(1));

    const solids = Array.from({ length: MAZE_ROWS }, () =>
      Array.from({ length: MAZE_COLS }, () => true),
    );
    solids[5]![20] = false;
    solids[8]![10] = false;
    expect(playerTopCenterCell(solids)).toEqual({ col: 20, row: 5 });
  });

  it("falls back to player spawn when no walkable cells exist", () => {
    const solids = Array.from({ length: MAZE_ROWS }, () =>
      Array.from({ length: MAZE_COLS }, () => true),
    );
    expect(playerTopCenterCell(solids)).toEqual({
      ...getActiveLayout().playerSpawn,
    });
  });

  it("wallPassPlayerSolids opens house, exterior, and interior walls; keeps non-tunnel edge walls solid", () => {
    const { walls, exterior, house, wallPassPlayerSolids, playerSolids } = getActiveLayout();
    let interiorWall = false;
    let houseCell = false;
    let exteriorCell = false;
    for (let row = 0; row < MAZE_ROWS; row += 1) {
      for (let col = 0; col < MAZE_COLS; col += 1) {
        const onEdge = row === 0 || row === MAZE_ROWS - 1 || col === 0 || col === MAZE_COLS - 1;
        if (walls[row]![col]) {
          if (onEdge) {
            expect(isWalkable(col, row, wallPassPlayerSolids)).toBe(false);
          } else {
            expect(isWalkable(col, row, wallPassPlayerSolids)).toBe(true);
            interiorWall = true;
          }
          expect(isWalkable(col, row, playerSolids)).toBe(false);
        }
        if (house[row]![col]) {
          expect(isWalkable(col, row, wallPassPlayerSolids)).toBe(true);
          houseCell = true;
        }
        if (exterior[row]![col]) {
          expect(isWalkable(col, row, wallPassPlayerSolids)).toBe(true);
          exteriorCell = true;
        }
      }
    }
    expect(interiorWall).toBe(true);
    expect(houseCell).toBe(true);
    expect(exteriorCell).toBe(true);
  });

  it("wallPassPlayerSolids keeps wrap on tunnel rows only", () => {
    const { wallPassPlayerSolids } = getActiveLayout();
    const pastLeft = MAZE_OFFSET_X - 4;
    expect(wrapPosition(pastLeft, cellCenterY(0), wallPassPlayerSolids).x).toBe(pastLeft);
    expect(wrapPosition(pastLeft, cellCenterY(1), wallPassPlayerSolids).x).toBe(pastLeft);
    expect(wrapPosition(pastLeft, cellCenterY(14), wallPassPlayerSolids).x).toBeCloseTo(
      pastLeft + MAZE_PIXEL_WIDTH,
      5,
    );
  });

  it("nearestWalkableCellCenter picks nearest under solids with spawn fallback", () => {
    const solids = Array.from({ length: MAZE_ROWS }, () =>
      Array.from({ length: MAZE_COLS }, () => true),
    );
    solids[10]![10] = false;
    solids[10]![12] = false;
    const from = { x: cellCenterX(11), y: cellCenterY(10) };
    expect(nearestWalkableCellCenter(from.x, from.y, solids)).toEqual({
      x: cellCenterX(10),
      y: cellCenterY(10),
    });

    const allSolid = Array.from({ length: MAZE_ROWS }, () =>
      Array.from({ length: MAZE_COLS }, () => true),
    );
    expect(nearestWalkableCellCenter(from.x, from.y, allSolid)).toEqual(playerSpawnCenter());

    const { walls, exterior, house } = getActiveLayout();
    let wallCol = -1;
    let wallRow = -1;
    for (let row = 0; row < MAZE_ROWS && wallCol < 0; row += 1) {
      for (let col = 0; col < MAZE_COLS; col += 1) {
        if (walls[row]![col] && !exterior[row]![col] && !house[row]![col]) {
          wallCol = col;
          wallRow = row;
          break;
        }
      }
    }
    expect(isWalkable(wallCol, wallRow)).toBe(false);
    const snapped = nearestWalkableCellCenter(cellCenterX(wallCol), cellCenterY(wallRow));
    expect(isWalkable(worldToCol(snapped.x), worldToRow(snapped.y))).toBe(true);
  });

  it("rejects malformed ASCII", () => {
    expect(() => parseMaze("#\n")).toThrow(/cols/);
  });

  it("rejects out-of-band and thin-gutter sizes", () => {
    expect(() => computeMazeGeometry(19, 31)).toThrow(/cols/);
    expect(() => computeMazeGeometry(28, 20)).toThrow(/rows/);
    expect(() => computeMazeGeometry(32, 21)).toThrow(/gutter|minimum/i);
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
    const spawn = getActiveLayout().playerSpawn;
    walls[spawn.row]![spawn.col] = true;
    expect(() => buildExterior(walls, { col: spawn.col, row: spawn.row })).toThrow(
      /no playable cells from spawn/,
    );
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
    const withEmptyExterior = pipeEdges(getActiveLayout().walls, emptyExterior);
    expect(withEmptyExterior.length).toBeGreaterThan(withDefault.length);
  });

  it("derives player display size from wall padding", () => {
    expect(playerDisplaySize()).toBe(TILE_SIZE - 2 * PLAYER_WALL_PADDING_PX);
    expect(playerDisplaySize(4, TILE_SIZE)).toBe(TILE_SIZE - 8);
  });

  it("clamps wall corner radius to a half tile", () => {
    expect(clampedWallCornerRadius(WALL_CORNER_RADIUS)).toBe(WALL_CORNER_RADIUS);
    expect(clampedWallCornerRadius(TILE_SIZE)).toBe(TILE_SIZE / 2);
    expect(clampedWallCornerRadius(-3)).toBe(0);
  });

  it("clamps wall inset within a half tile", () => {
    const maxInset = Math.floor((TILE_SIZE - 1) / 2);
    expect(clampedWallInset(WALL_INSET_PX)).toBe(Math.min(WALL_INSET_PX, maxInset));
    expect(clampedWallInset(TILE_SIZE)).toBe(maxInset);
    expect(clampedWallInset(-2)).toBe(0);
  });

  it("pulls corridor-facing wall strokes into the wall by the inset", () => {
    const inset = 3;
    const boundaryY = cellOriginY(1);
    const left = cellOriginX(1);
    const right = cellOriginX(2);
    const { walls, exterior } = getActiveLayout();
    const insetCommands = wallPathCommands(walls, exterior, WALL_CORNER_RADIUS, inset);
    const flushCommands = wallPathCommands(walls, exterior, WALL_CORNER_RADIUS, 0);

    const hasHorizontalAt = (commands: ReturnType<typeof wallPathCommands>, y: number) =>
      commands.some((command, index) => {
        if (command.type !== "line") {
          return false;
        }
        const prev = commands[index - 1];
        if (!prev || prev.type !== "move") {
          return false;
        }
        return (
          Math.abs(prev.y - y) < 0.01 &&
          Math.abs(command.y - y) < 0.01 &&
          prev.x >= left - TILE_SIZE &&
          command.x <= right + TILE_SIZE
        );
      });

    expect(hasHorizontalAt(flushCommands, boundaryY)).toBe(true);
    expect(hasHorizontalAt(insetCommands, boundaryY - inset)).toBe(true);
    expect(hasHorizontalAt(insetCommands, boundaryY)).toBe(false);
  });

  it("emits rounded wall path commands and skips exterior faces", () => {
    const commands = wallPathCommands();
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.some((command) => command.type === "line")).toBe(true);
    expect(commands.some((command) => command.type === "move")).toBe(true);

    const left = cellOriginX(0);
    const top = cellOriginY(13);
    const tunnelStubTiles = 6;
    const outlinesExteriorAboveTunnelStub = commands.some((command, index) => {
      if (command.type !== "line") {
        return false;
      }
      const prev = commands[index - 1];
      if (!prev || prev.type !== "move") {
        return false;
      }
      return (
        prev.y === top &&
        command.y === top &&
        prev.x >= left &&
        command.x <= left + TILE_SIZE * tunnelStubTiles
      );
    });
    expect(outlinesExteriorAboveTunnelStub).toBe(false);
  });

  it("defaults wall corner curves to circular", () => {
    expect(WALL_CORNER_CURVE_KIND).toBe("circular");
  });

  it("includes convex corner polylines at a known corridor corner", () => {
    const commands = wallPathCommands();
    const radius = clampedWallCornerRadius();
    const inset = clampedWallInset();
    const cornerX = cellOriginX(2) + inset;
    const cornerY = cellOriginY(2) + inset;
    const start = { x: cornerX + radius, y: cornerY };
    const end = { x: cornerX, y: cornerY + radius };
    const mid = {
      x: cornerX + radius * (1 - Math.SQRT1_2),
      y: cornerY + radius * (1 - Math.SQRT1_2),
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

  it("places concave fillet midpoints in the open quadrant", () => {
    const radius = clampedWallCornerRadius();
    const inset = clampedWallInset();
    const commands = wallPathCommands();
    const tipX = cellOriginX(1) - inset;
    const tipY = cellOriginY(1) - inset;
    const start = { x: tipX + radius, y: tipY };
    const end = { x: tipX, y: tipY + radius };
    const openMid = {
      x: tipX + radius * (1 - Math.SQRT1_2),
      y: tipY + radius * (1 - Math.SQRT1_2),
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
    const hasOpenMid = commands.some(
      (command) =>
        command.type === "line" &&
        Math.abs(command.x - openMid.x) < 0.75 &&
        Math.abs(command.y - openMid.y) < 0.75,
    );
    const hasWallTipNibble = commands.some(
      (command) =>
        command.type === "line" &&
        Math.abs(command.x - (tipX - radius * 0.25)) < 0.75 &&
        Math.abs(command.y - (tipY - radius * 0.25)) < 0.75,
    );
    expect(hasStart).toBe(true);
    expect(hasEnd).toBe(true);
    expect(hasOpenMid).toBe(true);
    expect(hasWallTipNibble).toBe(false);
  });

  it("shares tangent endpoints for circular and quadratic corner kinds", () => {
    const radius = clampedWallCornerRadius();
    const inset = clampedWallInset();
    const { walls, exterior } = getActiveLayout();
    const circular = wallPathCommands(walls, exterior, radius, inset, "circular");
    const quadratic = wallPathCommands(walls, exterior, radius, inset, "quadratic");
    const cornerX = cellOriginX(2) + inset;
    const cornerY = cellOriginY(2) + inset;
    const a = { x: cornerX + radius, y: cornerY };
    const b = { x: cornerX, y: cornerY + radius };
    const near = (command: { x: number; y: number }, point: { x: number; y: number }) =>
      Math.abs(command.x - point.x) < 0.01 && Math.abs(command.y - point.y) < 0.01;

    const tangentPair = (commands: ReturnType<typeof wallPathCommands>) => {
      const startIndex = commands.findIndex(
        (command) => command.type === "move" && (near(command, a) || near(command, b)),
      );
      expect(startIndex).toBeGreaterThanOrEqual(0);
      const start = commands[startIndex];
      const expectedEnd = start && near(start, a) ? b : a;
      const fillet = commands.slice(startIndex, startIndex + WALL_CORNER_CURVE_MIN_STEPS + 1);
      const last = fillet[fillet.length - 1];
      expect(fillet).toHaveLength(WALL_CORNER_CURVE_MIN_STEPS + 1);
      expect(last?.type).toBe("line");
      expect(last && near(last, expectedEnd)).toBe(true);
      return { start, last };
    };

    const circ = tangentPair(circular);
    const quad = tangentPair(quadratic);
    expect(circ.start && quad.start && near(circ.start, quad.start)).toBe(true);
    expect(circ.last && quad.last && near(circ.last, quad.last)).toBe(true);
  });

  it("ends half-tile fillets at the trimmed endpoint", () => {
    const radius = TILE_SIZE / 2;
    const inset = clampedWallInset();
    const { walls, exterior } = getActiveLayout();
    const commands = wallPathCommands(walls, exterior, radius);
    const cornerX = cellOriginX(2) + inset;
    const cornerY = cellOriginY(2) + inset;
    const a = { x: cornerX + radius, y: cornerY };
    const b = { x: cornerX, y: cornerY + radius };
    const near = (command: { x: number; y: number }, point: { x: number; y: number }) =>
      Math.abs(command.x - point.x) < 0.01 && Math.abs(command.y - point.y) < 0.01;

    const startIndex = commands.findIndex(
      (command) => command.type === "move" && (near(command, a) || near(command, b)),
    );
    expect(startIndex).toBeGreaterThanOrEqual(0);
    const start = commands[startIndex];
    const expectedEnd = start && near(start, a) ? b : a;
    const fillet = commands.slice(startIndex, startIndex + WALL_CORNER_CURVE_MIN_STEPS + 1);
    const last = fillet[fillet.length - 1];
    expect(fillet).toHaveLength(WALL_CORNER_CURVE_MIN_STEPS + 1);
    expect(last?.type).toBe("line");
    expect(last && near(last, expectedEnd)).toBe(true);
  });
});
