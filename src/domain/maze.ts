import { GHOST_PHASE } from "./ghostPhase";
import { MAZE_ASCII_BY_ID, type MazeLayoutId } from "./mazeLayouts";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

export type { MazeLayoutId } from "./mazeLayouts";
export { pickLayoutId, parseMazeParam, MAZE_LAYOUT_IDS } from "./mazeLayouts";

export const CLASSIC_MAZE_COLS = 28;
export const CLASSIC_MAZE_ROWS = 31;

export const MAZE_COLS_MIN = 20;
export const MAZE_COLS_MAX = 32;
export const MAZE_ROWS_MIN = 21;
export const MAZE_ROWS_MAX = 36;
export const MIN_TILE_SIZE = 12;
export const MIN_MAZE_OFFSET_X = 80;
export const HOUSE_FLOOR_MIN_COLS = 6;
export const HOUSE_FLOOR_MIN_ROWS = 3;
export const HOUSE_SPAWN_ROW_MIN_FLOORS = 4;

export const MAZE_TOP_MARGIN_PX = 28;

// Fixed pixel size for every maze tile, all layouts — Pac-Man, ghosts, and wall
// strokes render at the same size regardless of grid dimensions. Capped by the
// tallest layout in use (28x34 generated boards): floor((600-28)/34) = 16.
export const TILE_SIZE_PX = 16;
if (TILE_SIZE_PX < MIN_TILE_SIZE) {
  throw new Error(`fixed tile size ${TILE_SIZE_PX} below minimum ${MIN_TILE_SIZE}`);
}

export type MazeGeometry = {
  cols: number;
  rows: number;
  tileSize: number;
  pixelWidth: number;
  pixelHeight: number;
  offsetX: number;
  offsetY: number;
};

export function computeMazeGeometry(cols: number, rows: number): MazeGeometry {
  if (cols < MAZE_COLS_MIN || cols > MAZE_COLS_MAX) {
    throw new Error(`maze cols ${cols} outside ${MAZE_COLS_MIN}..${MAZE_COLS_MAX}`);
  }
  if (rows < MAZE_ROWS_MIN || rows > MAZE_ROWS_MAX) {
    throw new Error(`maze rows ${rows} outside ${MAZE_ROWS_MIN}..${MAZE_ROWS_MAX}`);
  }
  const usableHeight = Math.max(1, PLAYFIELD_HEIGHT - MAZE_TOP_MARGIN_PX);
  const tileSize = TILE_SIZE_PX;
  const pixelWidth = cols * tileSize;
  if (pixelWidth > PLAYFIELD_WIDTH) {
    throw new Error(`maze pixel width ${pixelWidth} exceeds playfield width ${PLAYFIELD_WIDTH}`);
  }
  const pixelHeight = rows * tileSize;
  if (pixelHeight > usableHeight) {
    throw new Error(`maze pixel height ${pixelHeight} exceeds usable height ${usableHeight}`);
  }
  const offsetX = (PLAYFIELD_WIDTH - pixelWidth) / 2;
  if (offsetX < MIN_MAZE_OFFSET_X) {
    throw new Error(`maze left gutter ${offsetX} below minimum ${MIN_MAZE_OFFSET_X}`);
  }
  const offsetY = MAZE_TOP_MARGIN_PX + Math.floor((usableHeight - pixelHeight) / 2);
  return { cols, rows, tileSize, pixelWidth, pixelHeight, offsetX, offsetY };
}

const classicGeometry = computeMazeGeometry(CLASSIC_MAZE_COLS, CLASSIC_MAZE_ROWS);

export let MAZE_COLS = classicGeometry.cols;
export let MAZE_ROWS = classicGeometry.rows;
export let TILE_SIZE = classicGeometry.tileSize;
export let MAZE_PIXEL_WIDTH = classicGeometry.pixelWidth;
export let MAZE_PIXEL_HEIGHT = classicGeometry.pixelHeight;
export let MAZE_OFFSET_X = classicGeometry.offsetX;
export let MAZE_OFFSET_Y = classicGeometry.offsetY;

export const MAZE_BACKGROUND_COLOR = 0x1a1a2e;
export const WALL_STROKE_COLOR = 0x2121ff;
export const WALL_STROKE_WEIGHT = 2;
export const WALL_CORNER_RADIUS = 6;
export const WALL_CORNER_CURVE_MIN_STEPS = 5;
export type WallCornerCurveKind = "circular" | "quadratic";
export const WALL_CORNER_CURVE_KIND: WallCornerCurveKind = "circular";
export const WALL_INSET_PX = 12;
export const PLAYER_WALL_PADDING_PX = 0;
export const PELLET_DISPLAY_SIZE_MAX = 16;
export const DOOR_GATE_COLOR = 0xffb8ff;

export function pelletDisplaySize(tileSize: number = TILE_SIZE): number {
  return Math.min(PELLET_DISPLAY_SIZE_MAX, tileSize);
}

export function powerPelletDisplaySize(tileSize: number = TILE_SIZE): number {
  return pelletDisplaySize(tileSize);
}

export const TURN_ALIGN_EPS = 2;

export const BASE_FRUIT_SPAWN_THRESHOLDS = [70, 170] as const;
export const BASE_INKY_RELEASE_PELLETS = 30;
export const BASE_CLYDE_RELEASE_PELLETS = 60;
export const BASE_ELROY1_DOTS_LEFT = 20;
export const BASE_ELROY2_DOTS_LEFT = 10;

export type SolidGrid = readonly (readonly boolean[])[];

export type MazeTile = { col: number; row: number };

export type MazeLayout = {
  id: MazeLayoutId | "generated";
  ascii: string;
  cols: number;
  rows: number;
  tileSize: number;
  pixelWidth: number;
  pixelHeight: number;
  offsetX: number;
  offsetY: number;
  walls: SolidGrid;
  exterior: SolidGrid;
  house: SolidGrid;
  door: SolidGrid;
  ghostSolids: SolidGrid;
  playerSolids: SolidGrid;
  wallPassPlayerSolids: SolidGrid;
  playerSpawn: MazeTile;
  ghostHouseSpawn: MazeTile;
  ghostHouseExit: MazeTile;
  fruitSpawn: MazeTile;
  pelletCount: number;
  fruitThresholds: readonly [number, number];
  inkyReleasePellets: number;
  clydeReleasePellets: number;
  elroy1DotsLeft: number;
  elroy2DotsLeft: number;
};

export type PipeEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type WallPathCommand =
  { type: "move"; x: number; y: number } | { type: "line"; x: number; y: number };

export function colorToCssHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function clampedWallCornerRadius(radius: number = WALL_CORNER_RADIUS): number {
  return Math.max(0, Math.min(radius, TILE_SIZE / 2));
}

export function clampedWallInset(inset: number = WALL_INSET_PX): number {
  return Math.max(0, Math.min(inset, Math.floor((TILE_SIZE - 1) / 2)));
}

export function playerDisplaySize(
  paddingPx: number = PLAYER_WALL_PADDING_PX,
  tileSize: number = TILE_SIZE,
): number {
  return Math.max(1, tileSize - 2 * paddingPx);
}

const WALL_CHAR = "#";
const DOOR_CHAR = "=";
const HOUSE_FLOOR_CHAR = "H";
const PLAYER_SPAWN_CHAR = "P";
const EMPTY_CORRIDOR_CHAR = "-";
const EMPTY_CELL_CHAR = " ";
const PELLET_CHARS = new Set([".", "@"]);
const EMPTY_CORRIDOR_CHARS = new Set([EMPTY_CELL_CHAR, EMPTY_CORRIDOR_CHAR, PLAYER_SPAWN_CHAR]);
const HOUSE_CHARS = new Set([DOOR_CHAR, HOUSE_FLOOR_CHAR]);
const KNOWN_MAZE_CHARS = new Set([
  WALL_CHAR,
  DOOR_CHAR,
  HOUSE_FLOOR_CHAR,
  PLAYER_SPAWN_CHAR,
  EMPTY_CORRIDOR_CHAR,
  EMPTY_CELL_CHAR,
  ".",
  "@",
]);

function scaleCount(n: number, pelletCount: number, basePelletCount: number): number {
  return Math.max(1, Math.round((n * pelletCount) / basePelletCount));
}

function scaleFruitThresholds(
  pelletCount: number,
  basePelletCount: number,
): readonly [number, number] {
  let first = scaleCount(BASE_FRUIT_SPAWN_THRESHOLDS[0], pelletCount, basePelletCount);
  let second = scaleCount(BASE_FRUIT_SPAWN_THRESHOLDS[1], pelletCount, basePelletCount);
  if (second <= first) {
    second = Math.min(pelletCount - 1, first + 1);
  }
  if (first >= pelletCount) {
    first = Math.max(1, pelletCount - 2);
  }
  if (second >= pelletCount) {
    second = Math.max(first + 1, pelletCount - 1);
  }
  return [first, second];
}

function scaleElroyCutoffs(
  pelletCount: number,
  basePelletCount: number,
): { elroy1DotsLeft: number; elroy2DotsLeft: number } {
  const elroy1DotsLeft = scaleCount(BASE_ELROY1_DOTS_LEFT, pelletCount, basePelletCount);
  let elroy2DotsLeft = scaleCount(BASE_ELROY2_DOTS_LEFT, pelletCount, basePelletCount);
  if (elroy2DotsLeft >= elroy1DotsLeft) {
    elroy2DotsLeft = Math.max(1, elroy1DotsLeft - 1);
  }
  return { elroy1DotsLeft, elroy2DotsLeft };
}

function readAsciiGrid(ascii: string): { lines: string[]; cols: number; rows: number } {
  const lines = ascii.split("\n");
  const rows = lines.length;
  if (rows === 0) {
    throw new Error("maze ascii is empty");
  }
  const cols = lines[0]!.length;
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    if (line.length !== cols) {
      throw new Error(`maze row ${row} must have ${cols} cols, got ${line.length}`);
    }
    for (let col = 0; col < cols; col += 1) {
      const ch = line[col] ?? "";
      if (!KNOWN_MAZE_CHARS.has(ch)) {
        throw new Error(`maze unknown char ${JSON.stringify(ch)} at ${col},${row}`);
      }
    }
  }
  return { lines, cols, rows };
}

function isEmptyCorridorChar(ch: string): boolean {
  return EMPTY_CORRIDOR_CHARS.has(ch);
}

function resolvePlayerSpawn(ascii: string, cols: number, rows: number): MazeTile {
  const lines = ascii.split("\n");
  const marked: MazeTile[] = [];
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    for (let col = 0; col < cols; col += 1) {
      if (line[col] === PLAYER_SPAWN_CHAR) {
        marked.push({ col, row });
      }
    }
  }
  if (marked.length > 1) {
    throw new Error(`maze has ${marked.length} player spawn markers; need at most one`);
  }
  if (marked.length === 1) {
    return marked[0]!;
  }

  const centerLeft = Math.floor((cols - 1) / 2);
  const centerRight = Math.ceil((cols - 1) / 2);
  let best: MazeTile | null = null;

  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    for (const col of [centerLeft, centerRight]) {
      if (!isEmptyCorridorChar(line[col] ?? "")) {
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

function collectCharCells(
  ascii: string,
  cols: number,
  rows: number,
  match: (ch: string) => boolean,
): MazeTile[] {
  const lines = ascii.split("\n");
  const cells: MazeTile[] = [];
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    for (let col = 0; col < cols; col += 1) {
      if (match(line[col] ?? "")) {
        cells.push({ col, row });
      }
    }
  }
  return cells;
}

function nearestHouseFloor(target: MazeTile, floors: readonly MazeTile[]): MazeTile {
  let best = floors[0];
  if (!best) {
    throw new Error("maze has no ghost house floor cells");
  }
  let bestDist = Math.abs(best.col - target.col) + Math.abs(best.row - target.row);
  for (const cell of floors) {
    const dist = Math.abs(cell.col - target.col) + Math.abs(cell.row - target.row);
    if (dist < bestDist) {
      best = cell;
      bestDist = dist;
    }
  }
  return best;
}

function deriveGhostHouseSpawn(ascii: string, cols: number, rows: number): MazeTile {
  const floors = collectCharCells(ascii, cols, rows, (ch) => ch === HOUSE_FLOOR_CHAR);
  if (floors.length === 0) {
    throw new Error("maze has no ghost house floor cells");
  }
  let minCol = floors[0]!.col;
  let maxCol = floors[0]!.col;
  let minRow = floors[0]!.row;
  let maxRow = floors[0]!.row;
  for (const cell of floors) {
    minCol = Math.min(minCol, cell.col);
    maxCol = Math.max(maxCol, cell.col);
    minRow = Math.min(minRow, cell.row);
    maxRow = Math.max(maxRow, cell.row);
  }
  const floorCols = maxCol - minCol + 1;
  const floorRows = maxRow - minRow + 1;
  if (floorCols < HOUSE_FLOOR_MIN_COLS || floorRows < HOUSE_FLOOR_MIN_ROWS) {
    throw new Error(
      `ghost house floors ${floorCols}x${floorRows}; need at least ${HOUSE_FLOOR_MIN_COLS}x${HOUSE_FLOOR_MIN_ROWS}`,
    );
  }
  const target = {
    col: Math.floor((minCol + maxCol) / 2),
    row: Math.floor((minRow + maxRow) / 2),
  };
  const spawn = floors.some((cell) => cell.col === target.col && cell.row === target.row)
    ? target
    : nearestHouseFloor(target, floors);
  const spawnRowFloors = floors.filter((cell) => cell.row === spawn.row).length;
  if (spawnRowFloors < HOUSE_SPAWN_ROW_MIN_FLOORS) {
    throw new Error(
      `ghost house spawn row ${spawn.row} has ${spawnRowFloors} floor cells; need ${HOUSE_SPAWN_ROW_MIN_FLOORS}`,
    );
  }
  return spawn;
}

function deriveGhostHouseExit(
  ascii: string,
  cols: number,
  rows: number,
  playerSolids: SolidGrid,
): MazeTile {
  const doors = collectCharCells(ascii, cols, rows, (ch) => ch === DOOR_CHAR);
  if (doors.length === 0) {
    throw new Error("maze has no ghost house door");
  }
  if (doors.length !== 2) {
    throw new Error(`ghost house door count ${doors.length}; need 2`);
  }
  const doorRow = doors[0]!.row;
  if (doors.some((cell) => cell.row !== doorRow)) {
    throw new Error("ghost house door must occupy a single row");
  }
  const minCol = Math.min(doors[0]!.col, doors[1]!.col);
  const maxCol = Math.max(doors[0]!.col, doors[1]!.col);
  if (maxCol - minCol !== 1) {
    throw new Error(`ghost house door width ${maxCol - minCol + 1}; need 2 contiguous`);
  }
  const col = Math.floor((minCol + maxCol) / 2);
  for (let row = doorRow - 1; row >= 0; row -= 1) {
    if (!(playerSolids[row]?.[col] ?? true)) {
      return { col, row };
    }
  }
  throw new Error("maze has no ghost house exit above the door");
}

function deriveFruitSpawn(
  ascii: string,
  cols: number,
  rows: number,
  playerSolids: SolidGrid,
  houseCenterCol: number,
): MazeTile {
  const floors = collectCharCells(ascii, cols, rows, (ch) => ch === HOUSE_FLOOR_CHAR);
  if (floors.length === 0) {
    throw new Error("maze has no ghost house floor cells");
  }
  const maxHouseRow = floors.reduce((max, cell) => Math.max(max, cell.row), floors[0]!.row);
  for (let row = maxHouseRow + 1; row < rows; row += 1) {
    if (!(playerSolids[row]?.[houseCenterCol] ?? true)) {
      return { col: houseCenterCol, row };
    }
  }
  throw new Error("maze has no fruit spawn below the ghost house");
}

function countPelletsInAscii(
  ascii: string,
  cols: number,
  rows: number,
  playerSolids: SolidGrid,
): number {
  const lines = ascii.split("\n");
  let count = 0;
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    for (let col = 0; col < cols; col += 1) {
      if (PELLET_CHARS.has(line[col] ?? "") && !(playerSolids[row]?.[col] ?? true)) {
        count += 1;
      }
    }
  }
  return count;
}

function emptyFlagGrid(cols: number, rows: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
}

function applyOppositeEdgeSafety(walls: boolean[][], cols: number, rows: number): void {
  for (let row = 0; row < rows; row += 1) {
    const left = walls[row]?.[0] ?? true;
    const right = walls[row]?.[cols - 1] ?? true;
    if (!left && right && walls[row]) {
      walls[row][0] = true;
    }
    if (!right && left && walls[row]) {
      walls[row][cols - 1] = true;
    }
  }

  for (let col = 0; col < cols; col += 1) {
    const top = walls[0]?.[col] ?? true;
    const bottom = walls[rows - 1]?.[col] ?? true;
    if (!top && bottom && walls[0]) {
      walls[0][col] = true;
    }
    if (!bottom && top && walls[rows - 1]) {
      walls[rows - 1][col] = true;
    }
  }
}

export function parseMaze(ascii: string = MAZE_ASCII_BY_ID.maze1): boolean[][] {
  const { lines, cols, rows } = readAsciiGrid(ascii);
  computeMazeGeometry(cols, rows);

  const grid: boolean[][] = [];
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    const walls: boolean[] = [];
    for (let col = 0; col < cols; col += 1) {
      const ch = line[col] ?? WALL_CHAR;
      walls.push(ch === WALL_CHAR);
    }
    grid.push(walls);
  }

  applyOppositeEdgeSafety(grid, cols, rows);
  return grid;
}

export function parseHouse(ascii: string = MAZE_ASCII_BY_ID.maze1): boolean[][] {
  const { lines, cols, rows } = readAsciiGrid(ascii);
  const house = emptyFlagGrid(cols, rows);
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    for (let col = 0; col < cols; col += 1) {
      const ch = line[col] ?? "";
      if (HOUSE_CHARS.has(ch)) {
        house[row]![col] = true;
      }
    }
  }
  return house;
}

export function parseDoor(ascii: string = MAZE_ASCII_BY_ID.maze1): boolean[][] {
  const { lines, cols, rows } = readAsciiGrid(ascii);
  const door = emptyFlagGrid(cols, rows);
  for (let row = 0; row < rows; row += 1) {
    const line = lines[row] ?? "";
    for (let col = 0; col < cols; col += 1) {
      if (line[col] === DOOR_CHAR) {
        door[row]![col] = true;
      }
    }
  }
  return door;
}

export function buildExterior(walls: SolidGrid, spawn: MazeTile): boolean[][] {
  const rows = walls.length;
  const cols = walls[0]?.length ?? 0;
  const exterior = emptyFlagGrid(cols, rows);
  const visited = emptyFlagGrid(cols, rows);
  const queue: { col: number; row: number }[] = [];
  let visitedCount = 0;

  if (!(walls[spawn.row]?.[spawn.col] ?? true)) {
    queue.push({ col: spawn.col, row: spawn.row });
    visited[spawn.row]![spawn.col] = true;
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
      if (next.col < 0 || next.col >= cols || next.row < 0 || next.row >= rows) {
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

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!(walls[row]?.[col] ?? true) && !visited[row]?.[col]) {
        exterior[row]![col] = true;
      }
    }
  }

  return exterior;
}

function buildBlocked(walls: SolidGrid, exterior: SolidGrid): boolean[][] {
  const rows = walls.length;
  const cols = walls[0]?.length ?? 0;
  const blocked = emptyFlagGrid(cols, rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      blocked[row]![col] = Boolean(walls[row]?.[col] || exterior[row]?.[col]);
    }
  }
  return blocked;
}

function buildPlayerSolids(walls: SolidGrid, exterior: SolidGrid, house: SolidGrid): boolean[][] {
  const rows = walls.length;
  const cols = walls[0]?.length ?? 0;
  const blocked = emptyFlagGrid(cols, rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      blocked[row]![col] = Boolean(walls[row]?.[col] || exterior[row]?.[col] || house[row]?.[col]);
    }
  }
  return blocked;
}

function buildWallPassPlayerSolids(walls: SolidGrid): boolean[][] {
  const rows = walls.length;
  const cols = walls[0]?.length ?? 0;
  const blocked = emptyFlagGrid(cols, rows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const onEdge = row === 0 || row === rows - 1 || col === 0 || col === cols - 1;
      if (onEdge && Boolean(walls[row]?.[col])) {
        blocked[row]![col] = true;
      }
    }
  }
  return blocked;
}

function assertHorizontalTunnels(solids: SolidGrid, cols: number, rows: number): void {
  for (let row = 0; row < rows; row += 1) {
    const here = !(solids[row]?.[0] ?? true) && !(solids[row]?.[cols - 1] ?? true);
    if (!here) {
      continue;
    }
    if (row + 1 < rows) {
      const next = !(solids[row + 1]?.[0] ?? true) && !(solids[row + 1]?.[cols - 1] ?? true);
      if (next) {
        throw new Error(`adjacent horizontal tunnel rows ${row} and ${row + 1}`);
      }
    }
  }
}

function syncActiveGeometry(layout: MazeLayout): void {
  MAZE_COLS = layout.cols;
  MAZE_ROWS = layout.rows;
  TILE_SIZE = layout.tileSize;
  MAZE_PIXEL_WIDTH = layout.pixelWidth;
  MAZE_PIXEL_HEIGHT = layout.pixelHeight;
  MAZE_OFFSET_X = layout.offsetX;
  MAZE_OFFSET_Y = layout.offsetY;
}

function buildLayoutFromAscii(id: MazeLayoutId | "generated", ascii: string): MazeLayout {
  const { cols, rows } = readAsciiGrid(ascii);
  const geometry = computeMazeGeometry(cols, rows);
  const playerSpawn = resolvePlayerSpawn(ascii, cols, rows);
  const walls = parseMaze(ascii);
  const exterior = buildExterior(walls, playerSpawn);
  const house = parseHouse(ascii);
  const door = parseDoor(ascii);
  const ghostSolids = buildBlocked(walls, exterior);
  const playerSolids = buildPlayerSolids(walls, exterior, house);
  const wallPassPlayerSolids = buildWallPassPlayerSolids(walls);
  assertHorizontalTunnels(playerSolids, cols, rows);
  const ghostHouseSpawn = deriveGhostHouseSpawn(ascii, cols, rows);
  const ghostHouseExit = deriveGhostHouseExit(ascii, cols, rows, playerSolids);
  const fruitSpawn = deriveFruitSpawn(ascii, cols, rows, playerSolids, ghostHouseSpawn.col);
  const pelletCount = countPelletsInAscii(ascii, cols, rows, playerSolids);
  if (pelletCount <= 0) {
    throw new Error(`maze ${id} has no pellets`);
  }

  const basePelletCount = id === "maze1" ? pelletCount : getLayout("maze1").pelletCount;
  const fruitThresholds = scaleFruitThresholds(pelletCount, basePelletCount);
  const { elroy1DotsLeft, elroy2DotsLeft } = scaleElroyCutoffs(pelletCount, basePelletCount);

  return {
    id,
    ascii,
    cols,
    rows,
    tileSize: geometry.tileSize,
    pixelWidth: geometry.pixelWidth,
    pixelHeight: geometry.pixelHeight,
    offsetX: geometry.offsetX,
    offsetY: geometry.offsetY,
    walls,
    exterior,
    house,
    door,
    ghostSolids,
    playerSolids,
    wallPassPlayerSolids,
    playerSpawn,
    ghostHouseSpawn,
    ghostHouseExit,
    fruitSpawn,
    pelletCount,
    fruitThresholds,
    inkyReleasePellets: scaleCount(BASE_INKY_RELEASE_PELLETS, pelletCount, basePelletCount),
    clydeReleasePellets: scaleCount(BASE_CLYDE_RELEASE_PELLETS, pelletCount, basePelletCount),
    elroy1DotsLeft,
    elroy2DotsLeft,
  };
}

function buildLayout(id: MazeLayoutId): MazeLayout {
  return buildLayoutFromAscii(id, MAZE_ASCII_BY_ID[id]);
}

export function layoutFromAscii(
  ascii: string,
  id: MazeLayoutId | "generated" = "generated",
): MazeLayout {
  return buildLayoutFromAscii(id, ascii);
}

const LAYOUT_CACHE: Partial<Record<MazeLayoutId, MazeLayout>> = {};

export function getLayout(id: MazeLayoutId): MazeLayout {
  const cached = LAYOUT_CACHE[id];
  if (cached) {
    return cached;
  }
  const layout = buildLayout(id);
  LAYOUT_CACHE[id] = layout;
  return layout;
}

let activeLayout: MazeLayout = getLayout("maze1");
syncActiveGeometry(activeLayout);

export function getActiveLayout(): MazeLayout {
  return activeLayout;
}

export function activateLayout(id: MazeLayoutId): MazeLayout {
  activeLayout = getLayout(id);
  syncActiveGeometry(activeLayout);
  return activeLayout;
}

export function activateAsciiLayout(ascii: string, id: "generated" = "generated"): MazeLayout {
  activeLayout = buildLayoutFromAscii(id, ascii);
  syncActiveGeometry(activeLayout);
  return activeLayout;
}

export function isHouse(
  col: number,
  row: number,
  house: SolidGrid = getActiveLayout().house,
): boolean {
  if (!inBounds(col, row)) {
    return false;
  }
  return house[row]?.[col] ?? false;
}

export function isDoor(
  col: number,
  row: number,
  door: SolidGrid = getActiveLayout().door,
): boolean {
  if (!inBounds(col, row)) {
    return false;
  }
  return door[row]?.[col] ?? false;
}

export function hasLeftGhostHouse(col: number, row: number): boolean {
  return !isHouse(col, row);
}

export function isGhostWalkable(
  col: number,
  row: number,
  solids: SolidGrid = getActiveLayout().ghostSolids,
): boolean {
  return isWalkable(col, row, solids);
}

export function ghostSolidsForPhase(phase: number): SolidGrid {
  const layout = getActiveLayout();
  return phase === GHOST_PHASE.active ? layout.playerSolids : layout.ghostSolids;
}

export function canGhostEnterDirection(
  x: number,
  y: number,
  dx: number,
  dy: number,
  phase: number,
  solids: SolidGrid = ghostSolidsForPhase(phase),
  door: SolidGrid = getActiveLayout().door,
): boolean {
  if (!canEnterDirection(x, y, dx, dy, solids)) {
    return false;
  }
  if (dy > 0) {
    const col = worldToCol(x);
    const row = worldToRow(y);
    if (isDoor(col + dx, row + dy, door)) {
      return false;
    }
  }
  return true;
}

export function ghostHouseSpawnCenter(): { x: number; y: number } {
  const { ghostHouseSpawn } = getActiveLayout();
  return {
    x: cellCenterX(ghostHouseSpawn.col),
    y: cellCenterY(ghostHouseSpawn.row),
  };
}

export function isGhostTunnelSlow(col: number, row: number): boolean {
  const { ghostSolids, cols } = getActiveLayout();
  if (!isWalkable(col, row, ghostSolids)) {
    return false;
  }
  if (!hasHorizontalTunnel(row, ghostSolids)) {
    return false;
  }
  const leftBand = Math.floor((cols * 5) / 28);
  const rightBand = Math.floor((cols * 6) / 28);
  return col <= leftBand || col >= cols - rightBand;
}

export function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < MAZE_COLS && row >= 0 && row < MAZE_ROWS;
}

export function isWall(
  col: number,
  row: number,
  walls: SolidGrid = getActiveLayout().walls,
): boolean {
  if (!inBounds(col, row)) {
    return true;
  }
  return walls[row]?.[col] ?? true;
}

export function isExterior(
  col: number,
  row: number,
  exterior: SolidGrid = getActiveLayout().exterior,
): boolean {
  if (!inBounds(col, row)) {
    return false;
  }
  return exterior[row]?.[col] ?? false;
}

export function isSolid(
  col: number,
  row: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
): boolean {
  if (!inBounds(col, row)) {
    return true;
  }
  return solids[row]?.[col] ?? true;
}

export function isWalkable(
  col: number,
  row: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
): boolean {
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

export function isTunnelMouth(
  col: number,
  row: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
): boolean {
  if (!isWalkable(col, row, solids)) {
    return false;
  }
  const opposite = oppositeTunnelCell(col, row);
  return opposite !== null && isWalkable(opposite.col, opposite.row, solids);
}

function hasHorizontalTunnel(
  row: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
): boolean {
  return isWalkable(0, row, solids) && isWalkable(MAZE_COLS - 1, row, solids);
}

function hasVerticalTunnel(
  col: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
): boolean {
  return isWalkable(col, 0, solids) && isWalkable(col, MAZE_ROWS - 1, solids);
}

function neighborOpen(
  col: number,
  row: number,
  dx: number,
  dy: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
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
  const { playerSpawn } = getActiveLayout();
  return {
    x: cellCenterX(playerSpawn.col),
    y: cellCenterY(playerSpawn.row),
  };
}

export function playerTopCenterCell(solids: SolidGrid = getActiveLayout().playerSolids): {
  col: number;
  row: number;
} {
  const { playerSpawn } = getActiveLayout();
  const idealCol = (MAZE_COLS - 1) / 2;
  const idealRow = 0;
  let bestCol = playerSpawn.col;
  let bestRow = playerSpawn.row;
  let bestDist = Number.POSITIVE_INFINITY;
  let found = false;

  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (!isWalkable(col, row, solids)) {
        continue;
      }
      found = true;
      const dx = col - idealCol;
      const dy = row - idealRow;
      const dist = dx * dx + dy * dy;
      if (
        dist < bestDist ||
        (dist === bestDist && (row < bestRow || (row === bestRow && col < bestCol)))
      ) {
        bestDist = dist;
        bestCol = col;
        bestRow = row;
      }
    }
  }

  if (!found) {
    return { col: playerSpawn.col, row: playerSpawn.row };
  }
  return { col: bestCol, row: bestRow };
}

export function playerTopCenterSpawn(solids: SolidGrid = getActiveLayout().playerSolids): {
  x: number;
  y: number;
} {
  const cell = playerTopCenterCell(solids);
  return { x: cellCenterX(cell.col), y: cellCenterY(cell.row) };
}

export function nearestWalkableCellCenter(
  x: number,
  y: number,
  solids: SolidGrid = getActiveLayout().playerSolids,
): { x: number; y: number } {
  const fromCol = worldToCol(x);
  const fromRow = worldToRow(y);
  let bestCol = -1;
  let bestRow = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  let found = false;

  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (!isWalkable(col, row, solids)) {
        continue;
      }
      found = true;
      const dx = col - fromCol;
      const dy = row - fromRow;
      const dist = dx * dx + dy * dy;
      if (
        dist < bestDist ||
        (dist === bestDist && (row < bestRow || (row === bestRow && col < bestCol)))
      ) {
        bestDist = dist;
        bestCol = col;
        bestRow = row;
      }
    }
  }

  if (!found) {
    return playerSpawnCenter();
  }
  return { x: cellCenterX(bestCol), y: cellCenterY(bestRow) };
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
  solids: SolidGrid = getActiveLayout().playerSolids,
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
  solids: SolidGrid = getActiveLayout().playerSolids,
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
  solids: SolidGrid = getActiveLayout().playerSolids,
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
  solids: SolidGrid = getActiveLayout().playerSolids,
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
  walls: SolidGrid = getActiveLayout().walls,
  exterior: SolidGrid = getActiveLayout().exterior,
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

function vertexKey(vc: number, vr: number): string {
  return `${vc},${vr}`;
}

function parseVertexKey(key: string): { vc: number; vr: number } {
  const [vc, vr] = key.split(",").map(Number) as [number, number];
  return { vc, vr };
}

function pixelToVertexKey(x: number, y: number): string {
  return vertexKey(
    Math.round((x - MAZE_OFFSET_X) / TILE_SIZE),
    Math.round((y - MAZE_OFFSET_Y) / TILE_SIZE),
  );
}

function directedEdgeKey(from: string, to: string): string {
  return `${from}>${to}`;
}

function appendQuadratic(
  commands: WallPathCommand[],
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  steps: number,
): void {
  const n = Math.max(1, Math.round(steps));
  commands.push({ type: "move", x: x0, y: y0 });
  for (let i = 1; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    commands.push({
      type: "line",
      x: u * u * x0 + 2 * u * t * cx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cy + t * t * y1,
    });
  }
}

function appendCircular(
  commands: WallPathCommand[],
  x0: number,
  y0: number,
  centerX: number,
  centerY: number,
  x1: number,
  y1: number,
  steps: number,
): void {
  const n = Math.max(1, Math.round(steps));
  const radius = Math.hypot(x0 - centerX, y0 - centerY);
  if (radius <= 0) {
    commands.push({ type: "move", x: x0, y: y0 });
    commands.push({ type: "line", x: x1, y: y1 });
    return;
  }
  const a0 = Math.atan2(y0 - centerY, x0 - centerX);
  const a1 = Math.atan2(y1 - centerY, x1 - centerX);
  let delta = a1 - a0;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  commands.push({ type: "move", x: x0, y: y0 });
  for (let i = 1; i <= n; i += 1) {
    const angle = a0 + (delta * i) / n;
    commands.push({
      type: "line",
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
}

function isMaskWall(col: number, row: number, walls: SolidGrid): boolean {
  return inBounds(col, row) && (walls[row]?.[col] ?? false);
}

function pipeAdjacency(edges: readonly PipeEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string): void => {
    const set = adj.get(a);
    if (set) {
      set.add(b);
    } else {
      adj.set(a, new Set([b]));
    }
  };
  for (const edge of edges) {
    const a = pixelToVertexKey(edge.x1, edge.y1);
    const b = pixelToVertexKey(edge.x2, edge.y2);
    link(a, b);
    link(b, a);
  }
  return adj;
}

function edgeInsetOffset(
  edge: PipeEdge,
  walls: SolidGrid,
  inset: number,
): { ox: number; oy: number } {
  if (inset <= 0) {
    return { ox: 0, oy: 0 };
  }
  const mx = (edge.x1 + edge.x2) / 2;
  const my = (edge.y1 + edge.y2) / 2;
  if (edge.y1 === edge.y2) {
    const col = Math.floor((mx - MAZE_OFFSET_X) / TILE_SIZE);
    const row = Math.floor((my - MAZE_OFFSET_Y) / TILE_SIZE);
    if (isWall(col, row, walls)) {
      return { ox: 0, oy: inset };
    }
    if (isWall(col, row - 1, walls)) {
      return { ox: 0, oy: -inset };
    }
    return { ox: 0, oy: 0 };
  }
  if (edge.x1 === edge.x2) {
    const col = Math.floor((mx - MAZE_OFFSET_X) / TILE_SIZE);
    const row = Math.floor((my - MAZE_OFFSET_Y) / TILE_SIZE);
    if (isWall(col, row, walls)) {
      return { ox: inset, oy: 0 };
    }
    if (isWall(col - 1, row, walls)) {
      return { ox: -inset, oy: 0 };
    }
  }
  return { ox: 0, oy: 0 };
}

function insetVertexPositions(
  adj: Map<string, Set<string>>,
  walls: SolidGrid,
  inset: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const [key, neighbors] of adj) {
    const { vc, vr } = parseVertexKey(key);
    const vx = cellOriginX(vc);
    const vy = cellOriginY(vr);
    if (inset <= 0) {
      positions.set(key, { x: vx, y: vy });
      continue;
    }
    let x = vx;
    let y = vy;
    for (const nKey of neighbors) {
      const n = parseVertexKey(nKey);
      const { ox, oy } = edgeInsetOffset(
        { x1: vx, y1: vy, x2: cellOriginX(n.vc), y2: cellOriginY(n.vr) },
        walls,
        inset,
      );
      if (ox !== 0) {
        x = vx + ox;
      }
      if (oy !== 0) {
        y = vy + oy;
      }
    }
    positions.set(key, { x, y });
  }
  return positions;
}

function vertexCornerQuads(
  vc: number,
  vr: number,
  walls: SolidGrid,
): { ox: number; oy: number; wall: boolean }[] {
  return [
    { ox: -1, oy: -1, wall: isMaskWall(vc - 1, vr - 1, walls) },
    { ox: 1, oy: -1, wall: isMaskWall(vc, vr - 1, walls) },
    { ox: -1, oy: 1, wall: isMaskWall(vc - 1, vr, walls) },
    { ox: 1, oy: 1, wall: isMaskWall(vc, vr, walls) },
  ];
}

export function wallPathCommands(
  walls: SolidGrid = getActiveLayout().walls,
  exterior: SolidGrid = getActiveLayout().exterior,
  cornerRadius: number = WALL_CORNER_RADIUS,
  insetPx: number = WALL_INSET_PX,
  curveKind: WallCornerCurveKind = WALL_CORNER_CURVE_KIND,
): WallPathCommand[] {
  const r = clampedWallCornerRadius(cornerRadius);
  const inset = clampedWallInset(insetPx);
  const edges = pipeEdges(walls, exterior);
  const commands: WallPathCommand[] = [];
  const trimmed = new Set<string>();
  const adj = pipeAdjacency(edges);
  const positions = insetVertexPositions(adj, walls, inset);

  if (r > 0) {
    for (const [key, neighbors] of adj) {
      const { vc, vr } = parseVertexKey(key);
      const pos = positions.get(key);
      if (!pos) {
        continue;
      }

      const quads = vertexCornerQuads(vc, vr, walls);
      const wallCount = quads.reduce((count, quad) => count + (quad.wall ? 1 : 0), 0);
      let feature: { ox: number; oy: number } | null = null;
      if (wallCount === 1) {
        feature = quads.find((quad) => quad.wall) ?? null;
      } else if (wallCount === 3) {
        feature = quads.find((quad) => !quad.wall) ?? null;
      }
      if (!feature) {
        continue;
      }

      const e1 = { dc: feature.ox, dr: 0 };
      const e2 = { dc: 0, dr: feature.oy };
      const n1 = vertexKey(vc + e1.dc, vr + e1.dr);
      const n2 = vertexKey(vc + e2.dc, vr + e2.dr);
      if (!neighbors.has(n1) || !neighbors.has(n2)) {
        continue;
      }

      const x0 = pos.x + e1.dc * r;
      const y0 = pos.y + e1.dr * r;
      const x1 = pos.x + e2.dc * r;
      const y1 = pos.y + e2.dr * r;
      const centerX = pos.x + feature.ox * r;
      const centerY = pos.y + feature.oy * r;

      if (curveKind === "quadratic") {
        appendQuadratic(commands, x0, y0, pos.x, pos.y, x1, y1, WALL_CORNER_CURVE_MIN_STEPS);
      } else {
        appendCircular(commands, x0, y0, centerX, centerY, x1, y1, WALL_CORNER_CURVE_MIN_STEPS);
      }
      trimmed.add(directedEdgeKey(key, n1));
      trimmed.add(directedEdgeKey(key, n2));
    }
  }

  for (const edge of edges) {
    const from = pixelToVertexKey(edge.x1, edge.y1);
    const to = pixelToVertexKey(edge.x2, edge.y2);
    const fromPos = positions.get(from);
    const toPos = positions.get(to);
    if (!fromPos || !toPos) {
      continue;
    }
    const dx = Math.sign(toPos.x - fromPos.x);
    const dy = Math.sign(toPos.y - fromPos.y);
    const trimStart = trimmed.has(directedEdgeKey(from, to)) ? r : 0;
    const trimEnd = trimmed.has(directedEdgeKey(to, from)) ? r : 0;
    const length = Math.abs(toPos.x - fromPos.x) + Math.abs(toPos.y - fromPos.y);
    if (length <= trimStart + trimEnd) {
      continue;
    }
    commands.push({
      type: "move",
      x: fromPos.x + dx * trimStart,
      y: fromPos.y + dy * trimStart,
    });
    commands.push({
      type: "line",
      x: toPos.x - dx * trimEnd,
      y: toPos.y - dy * trimEnd,
    });
  }

  return commands;
}

export function doorGateEdges(door: SolidGrid = getActiveLayout().door): PipeEdge[] {
  const edges: PipeEdge[] = [];
  for (let row = 0; row < MAZE_ROWS; row += 1) {
    for (let col = 0; col < MAZE_COLS; col += 1) {
      if (!(door[row]?.[col] ?? false)) {
        continue;
      }
      if (col > 0 && (door[row]?.[col - 1] ?? false)) {
        continue;
      }
      let end = col;
      while (end + 1 < MAZE_COLS && (door[row]?.[end + 1] ?? false)) {
        end += 1;
      }
      const y = cellCenterY(row);
      edges.push({
        x1: cellOriginX(col),
        y1: y,
        x2: cellOriginX(end) + TILE_SIZE,
        y2: y,
      });
    }
  }
  return edges;
}

export function wallCellCenters(
  walls: SolidGrid = getActiveLayout().walls,
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
  solids: SolidGrid = getActiveLayout().playerSolids,
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

export type PelletKind = "dot" | "power";

export function pelletCellCenters(
  ascii: string = getActiveLayout().ascii,
): { col: number; row: number; x: number; y: number; kind: PelletKind }[] {
  const rows = ascii.split("\n");
  const cells: { col: number; row: number; x: number; y: number; kind: PelletKind }[] = [];
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
          kind: ch === "@" ? "power" : "dot",
        });
      }
    }
  }
  return cells;
}
