export const MAZE_ASCII = `############################
#............##............#
#.####.#####.##.#####.####.#
#@#  #.#   #.##.#   #.#  #@#
#.####.#####.##.#####.####.#
#..........................#
#.####.##.########.##.####.#
#.####.##.########.##.####.#
#......##....##....##......#
######.##### ## #####.######
     #.##### ## #####.#     
     #.##          ##.#     
     #.## ###==### ##.#     
######.## #HHHHHH# ##.######
      .   #HHHHHH#   .      
######.## #HHHHHH# ##.######
     #.## ######## ##.#     
     #.##          ##.#     
     #.## ######## ##.#     
######.## ######## ##.######
#............##............#
#.####.#####.##.#####.####.#
#.####.#####.##.#####.####.#
#@..##.......  .......##..@#
###.##.##.########.##.##.###
###.##.##.########.##.##.###
#......##....##....##......#
#.##########.##.##########.#
#.##########.##.##########.#
#..........................#
############################`;

export const MAZE_COLS = 28;
export const MAZE_ROWS = 31;

export const TILE_SIZE = Math.floor(Math.min(800 / MAZE_COLS, 600 / MAZE_ROWS));

export const MAZE_PIXEL_WIDTH = MAZE_COLS * TILE_SIZE;
export const MAZE_PIXEL_HEIGHT = MAZE_ROWS * TILE_SIZE;

export const MAZE_OFFSET_X = (800 - MAZE_PIXEL_WIDTH) / 2;
export const MAZE_OFFSET_Y = Math.floor((600 - MAZE_PIXEL_HEIGHT) / 2);

export const WALL_COLOR = 0x2121ff;

export const TURN_ALIGN_EPS = 2;

export type SolidGrid = readonly (readonly boolean[])[];

export type PipeEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const WALL_CHAR = "#";
const DOOR_CHAR = "=";
const HOUSE_FLOOR_CHAR = "H";
const PELLET_CHARS = new Set([".", "@"]);
const EMPTY_CELL_CHAR = " ";
const HOUSE_CHARS = new Set([DOOR_CHAR, HOUSE_FLOOR_CHAR]);

export const GHOST_HOUSE_SPAWN_COL = 13;
export const GHOST_HOUSE_SPAWN_ROW = 14;
export const GHOST_HOUSE_EXIT_COL = 13;
export const GHOST_HOUSE_EXIT_ROW = 11;

function resolvePlayerSpawn(ascii: string = MAZE_ASCII): { col: number; row: number } {
  const rows = ascii.split("\n");
  const centerLeft = Math.floor((MAZE_COLS - 1) / 2);
  const centerRight = Math.ceil((MAZE_COLS - 1) / 2);
  let best: { col: number; row: number } | null = null;

  for (let row = 0; row < MAZE_ROWS; row += 1) {
    const line = rows[row] ?? "";
    for (const col of [centerLeft, centerRight]) {
      if (line[col] !== EMPTY_CELL_CHAR) {
        continue;
      }
      if (!best || row > best.row || (row === best.row && col < best.col)) {
        best = { col, row };
      }
    }
  }

  if (!best) {
    throw new Error("maze has no empty center cell for player spawn");
  }
  return best;
}

const PLAYER_SPAWN = resolvePlayerSpawn();
export const PLAYER_SPAWN_COL = PLAYER_SPAWN.col;
export const PLAYER_SPAWN_ROW = PLAYER_SPAWN.row;

function emptyFlagGrid(): boolean[][] {
  return Array.from({ length: MAZE_ROWS }, () => Array.from({ length: MAZE_COLS }, () => false));
}

function applyOppositeEdgeSafety(walls: boolean[][]): void {
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    const left = walls[row]?.[0] ?? true;
    const right = walls[row]?.[MAZE_COLS - 1] ?? true;
    if (!left && right && walls[row]) {
      walls[row][0] = true;
    }
    if (!right && left && walls[row]) {
      walls[row][MAZE_COLS - 1] = true;
    }
  }

  for (let col = 0; col < MAZE_COLS; col += 1) {
    const top = walls[0]?.[col] ?? true;
    const bottom = walls[MAZE_ROWS - 1]?.[col] ?? true;
    if (!top && bottom && walls[0]) {
      walls[0][col] = true;
    }
    if (!bottom && top && walls[MAZE_ROWS - 1]) {
      walls[MAZE_ROWS - 1][col] = true;
    }
  }
}

export function parseMaze(ascii: string = MAZE_ASCII): boolean[][] {
  const rows = ascii.split("\n");
  if (rows.length !== MAZE_ROWS) {
    throw new Error(`maze must have ${MAZE_ROWS} rows, got ${rows.length}`);
  }

  const grid: boolean[][] = [];
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    const line = rows[row] ?? "";
    if (line.length !== MAZE_COLS) {
      throw new Error(`maze row ${row} must have ${MAZE_COLS} cols, got ${line.length}`);
    }
    const walls: boolean[] = [];
    for (let col = 0; col < MAZE_COLS; col += 1) {
      const ch = line[col] ?? WALL_CHAR;
      walls.push(ch === WALL_CHAR);
    }
    grid.push(walls);
  }

  applyOppositeEdgeSafety(grid);
  return grid;
}

export function parseHouse(ascii: string = MAZE_ASCII): boolean[][] {
  const rows = ascii.split("\n");
  const house = emptyFlagGrid();
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    const line = rows[row] ?? "";
    for (let col = 0; col < MAZE_COLS; col += 1) {
      const ch = line[col] ?? "";
      if (HOUSE_CHARS.has(ch)) {
        house[row]![col] = true;
      }
    }
  }
  return house;
}

export function buildExterior(walls: SolidGrid): boolean[][] {
  const exterior = emptyFlagGrid();
  const visited = emptyFlagGrid();
  const queue: { col: number; row: number }[] = [];
  let visitedCount = 0;

  if (!(walls[PLAYER_SPAWN_ROW]?.[PLAYER_SPAWN_COL] ?? true)) {
    queue.push({ col: PLAYER_SPAWN_COL, row: PLAYER_SPAWN_ROW });
    visited[PLAYER_SPAWN_ROW]![PLAYER_SPAWN_COL] = true;
    visitedCount = 1;
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    const neighbors = [
      { col: current.col - 1, row: current.row },
      { col: current.col + 1, row: current.row },
      { col: current.col, row: current.row - 1 },
      { col: current.col, row: current.row + 1 },
    ];
    for (const next of neighbors) {
      if (next.col < 0 || next.col >= MAZE_COLS || next.row < 0 || next.row >= MAZE_ROWS) {
        continue;
      }
      if (visited[next.row]?.[next.col]) {
        continue;
      }
      if (walls[next.row]?.[next.col]) {
        continue;
      }
      visited[next.row]![next.col] = true;
      visitedCount += 1;
      queue.push(next);
    }
  }

  if (visitedCount === 0) {
    throw new Error("maze exterior flood found no playable cells from spawn");
  }

  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (!(walls[row]?.[col] ?? true) && !visited[row]?.[col]) {
        exterior[row]![col] = true;
      }
    }
  }

  return exterior;
}

function buildBlocked(walls: SolidGrid, exterior: SolidGrid): boolean[][] {
  const blocked = emptyFlagGrid();
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      blocked[row]![col] = Boolean(walls[row]?.[col] || exterior[row]?.[col]);
    }
  }
  return blocked;
}

function buildPlayerSolids(walls: SolidGrid, exterior: SolidGrid, house: SolidGrid): boolean[][] {
  const blocked = emptyFlagGrid();
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      blocked[row]![col] = Boolean(walls[row]?.[col] || exterior[row]?.[col] || house[row]?.[col]);
    }
  }
  return blocked;
}

export const MAZE_WALLS: SolidGrid = parseMaze(MAZE_ASCII);
export const MAZE_EXTERIOR: SolidGrid = buildExterior(MAZE_WALLS);
export const MAZE_HOUSE: SolidGrid = parseHouse(MAZE_ASCII);
export const MAZE_GHOST_SOLIDS: SolidGrid = buildBlocked(MAZE_WALLS, MAZE_EXTERIOR);
export const MAZE_PLAYER_SOLIDS: SolidGrid = buildPlayerSolids(
  MAZE_WALLS,
  MAZE_EXTERIOR,
  MAZE_HOUSE,
);
export const MAZE_SOLIDS: SolidGrid = MAZE_PLAYER_SOLIDS;

export function isHouse(col: number, row: number, house: SolidGrid = MAZE_HOUSE): boolean {
  if (!inBounds(col, row)) {
    return false;
  }
  return house[row]?.[col] ?? false;
}

export function isGhostSolid(
  col: number,
  row: number,
  solids: SolidGrid = MAZE_GHOST_SOLIDS,
): boolean {
  return isSolid(col, row, solids);
}

export function isGhostWalkable(
  col: number,
  row: number,
  solids: SolidGrid = MAZE_GHOST_SOLIDS,
): boolean {
  return isWalkable(col, row, solids);
}

export function ghostHouseSpawnCenter(): { x: number; y: number } {
  return {
    x: cellCenterX(GHOST_HOUSE_SPAWN_COL),
    y: cellCenterY(GHOST_HOUSE_SPAWN_ROW),
  };
}

export function isGhostTunnelSlow(col: number, row: number): boolean {
  if (!isWalkable(col, row, MAZE_GHOST_SOLIDS)) {
    return false;
  }
  if (!hasHorizontalTunnel(row, MAZE_GHOST_SOLIDS)) {
    return false;
  }
  return col <= 5 || col >= MAZE_COLS - 6;
}

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < MAZE_COLS && row >= 0 && row < MAZE_ROWS;
}

export function isWall(col: number, row: number, walls: SolidGrid = MAZE_WALLS): boolean {
  if (!inBounds(col, row)) {
    return true;
  }
  return walls[row]?.[col] ?? true;
}

export function isExterior(col: number, row: number, exterior: SolidGrid = MAZE_EXTERIOR): boolean {
  if (!inBounds(col, row)) {
    return false;
  }
  return exterior[row]?.[col] ?? false;
}

export function isSolid(col: number, row: number, solids: SolidGrid = MAZE_SOLIDS): boolean {
  if (!inBounds(col, row)) {
    return true;
  }
  return solids[row]?.[col] ?? true;
}

export function isWalkable(col: number, row: number, solids: SolidGrid = MAZE_SOLIDS): boolean {
  return !isSolid(col, row, solids);
}

export function oppositeTunnelCell(col: number, row: number): { col: number; row: number } | null {
  if (col === 0) {
    return { col: MAZE_COLS - 1, row };
  }
  if (col === MAZE_COLS - 1) {
    return { col: 0, row };
  }
  if (row === 0) {
    return { col, row: MAZE_ROWS - 1 };
  }
  if (row === MAZE_ROWS - 1) {
    return { col, row: 0 };
  }
  return null;
}

export function isTunnelMouth(col: number, row: number, solids: SolidGrid = MAZE_SOLIDS): boolean {
  if (!isWalkable(col, row, solids)) {
    return false;
  }
  const opposite = oppositeTunnelCell(col, row);
  return opposite !== null && isWalkable(opposite.col, opposite.row, solids);
}

function hasHorizontalTunnel(row: number, solids: SolidGrid = MAZE_SOLIDS): boolean {
  return isWalkable(0, row, solids) && isWalkable(MAZE_COLS - 1, row, solids);
}

function hasVerticalTunnel(col: number, solids: SolidGrid = MAZE_SOLIDS): boolean {
  return isWalkable(col, 0, solids) && isWalkable(col, MAZE_ROWS - 1, solids);
}

function neighborOpen(
  col: number,
  row: number,
  dx: number,
  dy: number,
  solids: SolidGrid = MAZE_SOLIDS,
): boolean {
  const nextCol = col + dx;
  const nextRow = row + dy;
  if (inBounds(nextCol, nextRow)) {
    return isWalkable(nextCol, nextRow, solids);
  }
  if (dx < 0 && col === 0 && dy === 0) {
    return isTunnelMouth(col, row, solids);
  }
  if (dx > 0 && col === MAZE_COLS - 1 && dy === 0) {
    return isTunnelMouth(col, row, solids);
  }
  if (dy < 0 && row === 0 && dx === 0) {
    return isTunnelMouth(col, row, solids);
  }
  if (dy > 0 && row === MAZE_ROWS - 1 && dx === 0) {
    return isTunnelMouth(col, row, solids);
  }
  return false;
}

export function cellOriginX(col: number): number {
  return MAZE_OFFSET_X + col * TILE_SIZE;
}

export function cellOriginY(row: number): number {
  return MAZE_OFFSET_Y + row * TILE_SIZE;
}

export function cellCenterX(col: number): number {
  return cellOriginX(col) + TILE_SIZE / 2;
}

export function cellCenterY(row: number): number {
  return cellOriginY(row) + TILE_SIZE / 2;
}

export function worldToCol(x: number): number {
  return Math.floor((x - MAZE_OFFSET_X) / TILE_SIZE);
}

export function worldToRow(y: number): number {
  return Math.floor((y - MAZE_OFFSET_Y) / TILE_SIZE);
}

export function playerSpawnCenter(): { x: number; y: number } {
  return {
    x: cellCenterX(PLAYER_SPAWN_COL),
    y: cellCenterY(PLAYER_SPAWN_ROW),
  };
}

export function isAlignedForTurn(x: number, y: number, eps: number = TURN_ALIGN_EPS): boolean {
  const col = worldToCol(x);
  const row = worldToRow(y);
  if (!inBounds(col, row)) {
    return false;
  }
  return Math.abs(x - cellCenterX(col)) <= eps && Math.abs(y - cellCenterY(row)) <= eps;
}

export function snapToCellCenter(x: number, y: number): { x: number; y: number } {
  const col = worldToCol(x);
  const row = worldToRow(y);
  return { x: cellCenterX(col), y: cellCenterY(row) };
}

export function snapPerpendicularToCenterline(
  x: number,
  y: number,
  dx: number,
  dy: number,
): { x: number; y: number } {
  const col = Math.min(MAZE_COLS - 1, Math.max(0, worldToCol(x)));
  const row = Math.min(MAZE_ROWS - 1, Math.max(0, worldToRow(y)));
  if (dx !== 0) {
    return { x, y: cellCenterY(row) };
  }
  if (dy !== 0) {
    return { x: cellCenterX(col), y };
  }
  return { x, y };
}

export function wrapPosition(
  x: number,
  y: number,
  solids: SolidGrid = MAZE_SOLIDS,
): { x: number; y: number } {
  let nextX = x;
  let nextY = y;
  const row = Math.min(MAZE_ROWS - 1, Math.max(0, worldToRow(y)));
  const col = Math.min(MAZE_COLS - 1, Math.max(0, worldToCol(x)));

  if (hasHorizontalTunnel(row, solids)) {
    if (nextX < MAZE_OFFSET_X) {
      nextX += MAZE_PIXEL_WIDTH;
    } else if (nextX >= MAZE_OFFSET_X + MAZE_PIXEL_WIDTH) {
      nextX -= MAZE_PIXEL_WIDTH;
    }
  }

  if (hasVerticalTunnel(col, solids)) {
    if (nextY < MAZE_OFFSET_Y) {
      nextY += MAZE_PIXEL_HEIGHT;
    } else if (nextY >= MAZE_OFFSET_Y + MAZE_PIXEL_HEIGHT) {
      nextY -= MAZE_PIXEL_HEIGHT;
    }
  }

  return { x: nextX, y: nextY };
}

export function wrappedTwinPosition(
  x: number,
  y: number,
  radius: number,
  solids: SolidGrid = MAZE_SOLIDS,
): { x: number; y: number } | null {
  const row = Math.min(MAZE_ROWS - 1, Math.max(0, worldToRow(y)));
  const col = Math.min(MAZE_COLS - 1, Math.max(0, worldToCol(x)));

  if (hasHorizontalTunnel(row, solids)) {
    if (x - radius < MAZE_OFFSET_X) {
      return { x: x + MAZE_PIXEL_WIDTH, y };
    }
    if (x + radius > MAZE_OFFSET_X + MAZE_PIXEL_WIDTH) {
      return { x: x - MAZE_PIXEL_WIDTH, y };
    }
  }

  if (hasVerticalTunnel(col, solids)) {
    if (y - radius < MAZE_OFFSET_Y) {
      return { x, y: y + MAZE_PIXEL_HEIGHT };
    }
    if (y + radius > MAZE_OFFSET_Y + MAZE_PIXEL_HEIGHT) {
      return { x, y: y - MAZE_PIXEL_HEIGHT };
    }
  }

  return null;
}

export function canEnterDirection(
  x: number,
  y: number,
  dx: number,
  dy: number,
  solids: SolidGrid = MAZE_SOLIDS,
): boolean {
  const col = Math.min(MAZE_COLS - 1, Math.max(0, worldToCol(x)));
  const row = Math.min(MAZE_ROWS - 1, Math.max(0, worldToRow(y)));
  return neighborOpen(col, row, dx, dy, solids);
}

export function clampAgainstFacingWall(
  x: number,
  y: number,
  dx: number,
  dy: number,
  solids: SolidGrid = MAZE_SOLIDS,
): { x: number; y: number } {
  let col = worldToCol(x);
  let row = worldToRow(y);

  if (isSolid(col, row, solids) && (dx !== 0 || dy !== 0)) {
    col -= dx;
    row -= dy;
    if (!isWalkable(col, row, solids)) {
      return { x, y };
    }
    if (dx > 0 || dx < 0) {
      return { x: cellCenterX(col), y };
    }
    return { x, y: cellCenterY(row) };
  }

  let nextX = x;
  let nextY = y;

  if (dx > 0 && !neighborOpen(col, row, 1, 0, solids)) {
    nextX = Math.min(nextX, cellCenterX(col));
  } else if (dx < 0 && !neighborOpen(col, row, -1, 0, solids)) {
    nextX = Math.max(nextX, cellCenterX(col));
  }

  if (dy > 0 && !neighborOpen(col, row, 0, 1, solids)) {
    nextY = Math.min(nextY, cellCenterY(row));
  } else if (dy < 0 && !neighborOpen(col, row, 0, -1, solids)) {
    nextY = Math.max(nextY, cellCenterY(row));
  }

  return { x: nextX, y: nextY };
}

function shouldDrawPipeAgainst(
  col: number,
  row: number,
  walls: SolidGrid,
  exterior: SolidGrid,
): boolean {
  if (isWall(col, row, walls)) {
    return false;
  }
  if (isExterior(col, row, exterior)) {
    return false;
  }
  return true;
}

export function pipeEdges(
  walls: SolidGrid = MAZE_WALLS,
  exterior: SolidGrid = MAZE_EXTERIOR,
): PipeEdge[] {
  const edges: PipeEdge[] = [];

  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (!isWall(col, row, walls)) {
        continue;
      }
      const left = cellOriginX(col);
      const right = left + TILE_SIZE;
      const top = cellOriginY(row);
      const bottom = top + TILE_SIZE;

      if (shouldDrawPipeAgainst(col, row - 1, walls, exterior)) {
        edges.push({ x1: left, y1: top, x2: right, y2: top });
      }
      if (shouldDrawPipeAgainst(col, row + 1, walls, exterior)) {
        edges.push({ x1: left, y1: bottom, x2: right, y2: bottom });
      }
      if (shouldDrawPipeAgainst(col - 1, row, walls, exterior)) {
        edges.push({ x1: left, y1: top, x2: left, y2: bottom });
      }
      if (shouldDrawPipeAgainst(col + 1, row, walls, exterior)) {
        edges.push({ x1: right, y1: top, x2: right, y2: bottom });
      }
    }
  }

  return edges;
}

export function wallCellCenters(
  walls: SolidGrid = MAZE_WALLS,
): { col: number; row: number; x: number; y: number }[] {
  const cells: { col: number; row: number; x: number; y: number }[] = [];
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (isWall(col, row, walls)) {
        cells.push({
          col,
          row,
          x: cellCenterX(col),
          y: cellCenterY(row),
        });
      }
    }
  }
  return cells;
}

export function walkableCellCenters(
  solids: SolidGrid = MAZE_SOLIDS,
): { col: number; row: number; x: number; y: number }[] {
  const cells: { col: number; row: number; x: number; y: number }[] = [];
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (isWalkable(col, row, solids)) {
        cells.push({
          col,
          row,
          x: cellCenterX(col),
          y: cellCenterY(row),
        });
      }
    }
  }
  return cells;
}

export function pelletCellCenters(
  ascii: string = MAZE_ASCII,
): { col: number; row: number; x: number; y: number }[] {
  const rows = ascii.split("\n");
  const cells: { col: number; row: number; x: number; y: number }[] = [];
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    const line = rows[row] ?? "";
    for (let col = 0; col < MAZE_COLS; col += 1) {
      const ch = line[col] ?? "";
      if (PELLET_CHARS.has(ch) && isWalkable(col, row)) {
        cells.push({
          col,
          row,
          x: cellCenterX(col),
          y: cellCenterY(row),
        });
      }
    }
  }
  return cells;
}
