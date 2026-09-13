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
     #.## ###--### ##.#     
######.## #------# ##.######
      .   #------#   .      
######.## #------# ##.######
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

export const PLAYER_SPAWN_ROW = 29;
export const PLAYER_SPAWN_COL = 13;

export const TURN_ALIGN_EPS = 2;

export type SolidGrid = readonly (readonly boolean[])[];

export type PipeEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const SOLID_CHARS = new Set(["#", "-"]);

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
    const solids: boolean[] = [];
    for (let col = 0; col < MAZE_COLS; col += 1) {
      const ch = line[col] ?? "#";
      let solid = SOLID_CHARS.has(ch);
      if (col === 0 || col === MAZE_COLS - 1) {
        solid = true;
      }
      solids.push(solid);
    }
    grid.push(solids);
  }
  return grid;
}

export const MAZE_SOLIDS: SolidGrid = parseMaze(MAZE_ASCII);

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < MAZE_COLS && row >= 0 && row < MAZE_ROWS;
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
  const col = worldToCol(x);
  const row = worldToRow(y);
  if (dx !== 0) {
    return { x, y: cellCenterY(row) };
  }
  if (dy !== 0) {
    return { x: cellCenterX(col), y };
  }
  return { x, y };
}

export function canEnterDirection(
  x: number,
  y: number,
  dx: number,
  dy: number,
  solids: SolidGrid = MAZE_SOLIDS,
): boolean {
  const col = worldToCol(x);
  const row = worldToRow(y);
  return isWalkable(col + dx, row + dy, solids);
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
    if (dx > 0) {
      return { x: cellCenterX(col), y };
    }
    if (dx < 0) {
      return { x: cellCenterX(col), y };
    }
    if (dy > 0) {
      return { x, y: cellCenterY(row) };
    }
    return { x, y: cellCenterY(row) };
  }

  let nextX = x;
  let nextY = y;

  if (dx > 0 && !isWalkable(col + 1, row, solids)) {
    nextX = Math.min(nextX, cellCenterX(col));
  } else if (dx < 0 && !isWalkable(col - 1, row, solids)) {
    nextX = Math.max(nextX, cellCenterX(col));
  }

  if (dy > 0 && !isWalkable(col, row + 1, solids)) {
    nextY = Math.min(nextY, cellCenterY(row));
  } else if (dy < 0 && !isWalkable(col, row - 1, solids)) {
    nextY = Math.max(nextY, cellCenterY(row));
  }

  return { x: nextX, y: nextY };
}

export function pipeEdges(solids: SolidGrid = MAZE_SOLIDS): PipeEdge[] {
  const edges: PipeEdge[] = [];

  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (!isSolid(col, row, solids)) {
        continue;
      }
      const left = cellOriginX(col);
      const right = left + TILE_SIZE;
      const top = cellOriginY(row);
      const bottom = top + TILE_SIZE;

      if (!isSolid(col, row - 1, solids)) {
        edges.push({ x1: left, y1: top, x2: right, y2: top });
      }
      if (!isSolid(col, row + 1, solids)) {
        edges.push({ x1: left, y1: bottom, x2: right, y2: bottom });
      }
      if (!isSolid(col - 1, row, solids)) {
        edges.push({ x1: left, y1: top, x2: left, y2: bottom });
      }
      if (!isSolid(col + 1, row, solids)) {
        edges.push({ x1: right, y1: top, x2: right, y2: bottom });
      }
    }
  }

  return edges;
}

export function solidCellCenters(
  solids: SolidGrid = MAZE_SOLIDS,
): { col: number; row: number; x: number; y: number }[] {
  const cells: { col: number; row: number; x: number; y: number }[] = [];
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (isSolid(col, row, solids)) {
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
