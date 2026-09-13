/**
 * Static Pac-Man maze layout and Phaser-free helpers (collision, centers, pipe edges).
 * Scenes spawn Wall entities from this data; movement reads the grid.
 */

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

/** Max integer tile that fits 28×31 into 800×600. */
export const TILE_SIZE = Math.floor(Math.min(800 / MAZE_COLS, 600 / MAZE_ROWS)); /* 19 */

export const MAZE_PIXEL_WIDTH = MAZE_COLS * TILE_SIZE;
export const MAZE_PIXEL_HEIGHT = MAZE_ROWS * TILE_SIZE;

/** Center the maze in the 800×600 canvas. */
export const MAZE_OFFSET_X = (800 - MAZE_PIXEL_WIDTH) / 2; /* 134 */
export const MAZE_OFFSET_Y = Math.floor((600 - MAZE_PIXEL_HEIGHT) / 2); /* 5 */

/** Classic-ish Pac-Man wall blue for pipe outlines. */
export const WALL_COLOR = 0x2121ff;

export const PLAYER_SPAWN_ROW = 29;
export const PLAYER_SPAWN_COL = 13;

/** Alignment window for buffered turns (pixels). */
export const TURN_ALIGN_EPS = 2;

export type SolidGrid = readonly (readonly boolean[])[];

export type PipeEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const SOLID_CHARS = new Set(["#", "-"]);

/**
 * Parse ASCII into a solid grid. `#` and `-` are solid; `.` `@` and space are open.
 * Columns 0 and COLS-1 are forced solid (no tunnels).
 */
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

/** Pre-parsed solid grid for the shipped maze. */
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

/** True when the center is close enough to the cell center to allow a turn. */
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

/**
 * Snap the axis perpendicular to travel onto the current corridor centerline.
 * dx/dy are unit cell steps (-1|0|1).
 */
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

/** Neighbor cell in direction (dx, dy) is walkable from the cell containing (x, y). */
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

/**
 * After integrating along facing, do not pass the cell center toward a solid neighbor.
 */
export function clampAgainstFacingWall(
  x: number,
  y: number,
  dx: number,
  dy: number,
  solids: SolidGrid = MAZE_SOLIDS,
): { x: number; y: number } {
  const col = worldToCol(x);
  const row = worldToRow(y);
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

/**
 * Circle vs solid tile resolve: push the center out of any overlapping solid AABB.
 * Uses a tiny inset so radius === TILE_SIZE/2 sits flush in an open cell without
 * false overlaps from float noise.
 */
export function resolveCircleAgainstMaze(
  x: number,
  y: number,
  radius: number,
  solids: SolidGrid = MAZE_SOLIDS,
): { x: number; y: number } {
  const inset = 1e-6;
  const r = Math.max(0, radius - inset);
  let cx = x;
  let cy = y;

  const minCol = worldToCol(cx - r);
  const maxCol = worldToCol(cx + r);
  const minRow = worldToRow(cy - r);
  const maxRow = worldToRow(cy + r);

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!isSolid(col, row, solids)) {
        continue;
      }
      const left = cellOriginX(col);
      const right = left + TILE_SIZE;
      const top = cellOriginY(row);
      const bottom = top + TILE_SIZE;

      const nearestX = Math.min(right, Math.max(left, cx));
      const nearestY = Math.min(bottom, Math.max(top, cy));
      const ovx = cx - nearestX;
      const ovy = cy - nearestY;
      const distSq = ovx * ovx + ovy * ovy;

      if (distSq >= r * r) {
        continue;
      }

      if (distSq < 1e-12) {
        const dl = Math.abs(cx - left);
        const dr = Math.abs(right - cx);
        const dt = Math.abs(cy - top);
        const db = Math.abs(bottom - cy);
        const best = Math.min(dl, dr, dt, db);
        if (best === dl) {
          cx = left - r;
        } else if (best === dr) {
          cx = right + r;
        } else if (best === dt) {
          cy = top - r;
        } else {
          cy = bottom + r;
        }
        continue;
      }

      const dist = Math.sqrt(distSq);
      const push = (r - dist) / dist;
      cx += ovx * push;
      cy += ovy * push;
    }
  }

  return { x: cx, y: cy };
}

/**
 * Pipe outline segments: each solid-cell edge that borders a non-solid cell
 * (walkable or out-of-bounds) so outer walls and corridor pipes both draw.
 */
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

/** List solid cell centers for spawning Wall entities. */
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
