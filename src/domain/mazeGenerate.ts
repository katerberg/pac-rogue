import { layoutFromAscii, type MazeLayout, type SolidGrid } from "./maze";
import { pickLayoutId, type MazeLayoutId } from "./mazeLayouts";
import {
  CENTER_PIECE,
  randomFromSeed,
  solveTiling,
  TILING_HEIGHT,
  TILING_WIDTH,
  type TilingPiece,
} from "./mazeTiling";

export const GENERATED_MAZE_COLS = 28;
export const GENERATED_MAZE_ROWS = 34;
export const GENERATE_MAX_ATTEMPTS = 32;
// Classic maze1 carries 244 pellets; boards well under that read as undersized.
export const GENERATED_PELLET_TARGET = 240;

// Every board rule throws this; anything else out of generateMazeAscii is a bug the
// attempt loop must not swallow.
class MazeRejected extends Error {}

const WALL = "#";
const CORRIDOR = "-";
const PELLET = ".";
const POWER = "@";
const DOOR = "=";
const HOUSE = "H";
const SPAWN = "P";

const HOUSE_STAMP: readonly string[] = ["###==###", "#HHHHHH#", "#HHHHHH#", "#HHHHHH#", "########"];

function emptyGrid(cols: number, rows: number, fill: string): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function solverCellOrigin(sx: number, sy: number): { col: number; row: number } {
  return { col: 1 + sx * 3, row: 1 + sy * 3 };
}

const houseStampOrigin = solverCellOrigin(
  Math.min(...CENTER_PIECE.cells.map((cell) => cell % TILING_WIDTH)),
  Math.min(...CENTER_PIECE.cells.map((cell) => Math.floor(cell / TILING_WIDTH))),
);
const HOUSE_STAMP_COL0 = houseStampOrigin.col;
const HOUSE_STAMP_ROW0 = houseStampOrigin.row;

function pieceIdByCell(pieces: readonly TilingPiece[]): Int16Array {
  const ids = new Int16Array(TILING_WIDTH * TILING_HEIGHT).fill(-1);
  pieces.forEach((piece, index) => {
    for (const cell of piece.cells) {
      ids[cell] = index;
    }
  });
  return ids;
}

function fillTilingWalls(grid: string[][], pieces: readonly TilingPiece[]): void {
  const ids = pieceIdByCell(pieces);
  for (let sy = 0; sy < TILING_HEIGHT; sy += 1) {
    for (let sx = 0; sx < TILING_WIDTH; sx += 1) {
      const cell = sy * TILING_WIDTH + sx;
      const { col, row } = solverCellOrigin(sx, sy);
      for (let dy = 0; dy < 2; dy += 1) {
        for (let dx = 0; dx < 2; dx += 1) {
          grid[row + dy]![col + dx] = WALL;
        }
      }
      if (sx + 1 < TILING_WIDTH) {
        const right = sy * TILING_WIDTH + sx + 1;
        const gapCol = col + 2;
        const same = ids[cell] >= 0 && ids[cell] === ids[right];
        for (let dy = 0; dy < 2; dy += 1) {
          grid[row + dy]![gapCol] = same ? WALL : CORRIDOR;
        }
      }
      if (sy + 1 < TILING_HEIGHT) {
        const below = (sy + 1) * TILING_WIDTH + sx;
        const gapRow = row + 2;
        const same = ids[cell] >= 0 && ids[cell] === ids[below];
        for (let dx = 0; dx < 2; dx += 1) {
          grid[gapRow]![col + dx] = same ? WALL : CORRIDOR;
        }
      }
      if (sx + 1 < TILING_WIDTH && sy + 1 < TILING_HEIGHT) {
        const right = sy * TILING_WIDTH + sx + 1;
        const below = (sy + 1) * TILING_WIDTH + sx;
        const diag = (sy + 1) * TILING_WIDTH + sx + 1;
        const gapCol = col + 2;
        const gapRow = row + 2;
        const id = ids[cell];
        const junctionWall = id >= 0 && id === ids[right] && id === ids[below] && id === ids[diag];
        grid[gapRow]![gapCol] = junctionWall ? WALL : CORRIDOR;
      }
    }
  }
}

function stampHouse(grid: string[][]): void {
  for (let r = 0; r < HOUSE_STAMP.length; r += 1) {
    const line = HOUSE_STAMP[r]!;
    for (let c = 0; c < line.length; c += 1) {
      grid[HOUSE_STAMP_ROW0 + r]![HOUSE_STAMP_COL0 + c] = line[c]!;
    }
  }
}

function isHouseStampCell(col: number, row: number): boolean {
  return (
    row >= HOUSE_STAMP_ROW0 &&
    row < HOUSE_STAMP_ROW0 + HOUSE_STAMP.length &&
    col >= HOUSE_STAMP_COL0 &&
    col < HOUSE_STAMP_COL0 + HOUSE_STAMP[0]!.length
  );
}

function* houseStampCells(): Generator<{ col: number; row: number }> {
  for (let r = 0; r < HOUSE_STAMP.length; r += 1) {
    for (let c = 0; c < HOUSE_STAMP[r]!.length; c += 1) {
      yield { col: HOUSE_STAMP_COL0 + c, row: HOUSE_STAMP_ROW0 + r };
    }
  }
}

// Orthogonal sides plus the four diagonal corners, so pellets are cleared all the way
// around the house stamp's rectangular border, not just where it's edge-adjacent.
const HOUSE_ADJACENT_OFFSETS: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function clearAroundHouseStamp(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  for (const { col, row } of houseStampCells()) {
    for (const [dc, dr] of HOUSE_ADJACENT_OFFSETS) {
      const nCol = col + dc;
      const nRow = row + dr;
      if (nCol < 0 || nCol >= cols || nRow < 0 || nRow >= rows) {
        continue;
      }
      const ch = grid[nRow]![nCol]!;
      if (ch === PELLET || ch === POWER) {
        grid[nRow]![nCol] = CORRIDOR;
      }
    }
  }
}

function isHouseChar(ch: string): boolean {
  return ch === HOUSE || ch === DOOR;
}

function isWalkableChar(ch: string): boolean {
  return ch === CORRIDOR || ch === PELLET || ch === POWER || ch === SPAWN || ch === " ";
}

// Corridor rows only: a tunnel carved through a wall row runs alongside the corridor
// row next to it, which is the parallel-corridor case.
function pickTunnelRows(seed: string, houseRows: ReadonlySet<number>): number[] {
  const random = randomFromSeed(`tunnels:${seed}`);
  const pool: number[] = [];
  for (let sy = 0; sy + 1 < TILING_HEIGHT; sy += 1) {
    const row = solverCellOrigin(0, sy).row + 2;
    if (!houseRows.has(row)) {
      pool.push(row);
    }
  }
  if (pool.length === 0) {
    throw new MazeRejected("no tunnel candidate rows");
  }
  const count = random() < 0.5 ? 1 : 2;
  const chosen: number[] = [];
  while (chosen.length < count && pool.length > 0) {
    chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  }
  return chosen.sort((a, b) => a - b);
}

function tunnelKey(col: number, row: number): string {
  return `${col},${row}`;
}

// Returns the cells carved through wall to open the tunnel — the tunnel itself, as opposed
// to the pre-existing interior corridor cell it merges into.
function applyTunnels(
  grid: string[][],
  tunnelRows: readonly number[],
): { col: number; row: number }[] {
  const cols = grid[0]!.length;
  const carved: { col: number; row: number }[] = [];
  for (const row of tunnelRows) {
    grid[row]![0] = CORRIDOR;
    grid[row]![cols - 1] = CORRIDOR;
    carved.push({ col: 0, row }, { col: cols - 1, row });
    for (let col = 1; col < cols - 1; col += 1) {
      if (isWalkableChar(grid[row]![col]!)) {
        break;
      }
      grid[row]![col] = CORRIDOR;
      grid[row]![cols - 1 - col] = CORRIDOR;
      carved.push({ col, row }, { col: cols - 1 - col, row });
    }
  }
  return carved;
}

function neighbors(
  col: number,
  row: number,
  cols: number,
  rows: number,
  tunnelRows: ReadonlySet<number>,
): [number, number][] {
  const out: [number, number][] = [];
  if (row > 0) {
    out.push([col, row - 1]);
  }
  if (row + 1 < rows) {
    out.push([col, row + 1]);
  }
  if (col > 0) {
    out.push([col - 1, row]);
  } else if (tunnelRows.has(row)) {
    out.push([cols - 1, row]);
  }
  if (col + 1 < cols) {
    out.push([col + 1, row]);
  } else if (tunnelRows.has(row)) {
    out.push([0, row]);
  }
  return out;
}

function isPlayerCorridorChar(ch: string): boolean {
  return isWalkableChar(ch) && !isHouseChar(ch);
}

function corridorDegree(
  grid: string[][],
  col: number,
  row: number,
  tunnelRows: ReadonlySet<number>,
): number {
  const rows = grid.length;
  const cols = grid[0]!.length;
  let degree = 0;
  for (const [nCol, nRow] of neighbors(col, row, cols, rows, tunnelRows)) {
    if (isPlayerCorridorChar(grid[nRow]![nCol]!)) {
      degree += 1;
    }
  }
  return degree;
}

function sealDeadEnds(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  let changed = true;
  let guard = 0;
  while (changed) {
    changed = false;
    guard += 1;
    if (guard > rows * cols) {
      throw new MazeRejected("sealDeadEnds did not converge");
    }
    const tunnelSet = new Set(countTunnels(grid));
    const tips: { col: number; row: number }[] = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!isPlayerCorridorChar(grid[row]![col]!)) {
          continue;
        }
        if (corridorDegree(grid, col, row, tunnelSet) < 2) {
          tips.push({ col, row });
        }
      }
    }
    for (const tip of tips) {
      if (grid[tip.row]![tip.col] === WALL) {
        continue;
      }
      grid[tip.row]![tip.col] = WALL;
      const mirrorCol = cols - 1 - tip.col;
      if (mirrorCol !== tip.col) {
        grid[tip.row]![mirrorCol] = WALL;
      }
      changed = true;
    }
  }
}

// Walks from (col,row) toward the tunnel mouth at mouthCol along the same row. True if a
// wall breaks the straight run before reaching it (no direct shot) or a cell along the way
// opens vertically (a place to turn off); false only for an unbroken, turn-free beeline
// straight into the tunnel, which is what a power pellet must never sit behind.
function hasTurnBeforeTunnelMouth(
  grid: string[][],
  col: number,
  row: number,
  mouthCol: number,
): boolean {
  const step = mouthCol === 0 ? -1 : 1;
  for (let c = col + step; c !== mouthCol; c += step) {
    const ch = grid[row]?.[c];
    if (ch === undefined || !isWalkableChar(ch)) {
      return true;
    }
    const above = grid[row - 1]?.[c];
    const below = grid[row + 1]?.[c];
    if (
      (above !== undefined && isWalkableChar(above)) ||
      (below !== undefined && isWalkableChar(below))
    ) {
      return true;
    }
  }
  return false;
}

function nearTunnelMouthCol(col: number, cols: number): number {
  return col <= (cols - 1) / 2 ? 0 : cols - 1;
}

function assertPowerPelletsHaveTunnelTurn(grid: string[][], tunnelRows: readonly number[]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const tunnelSet = new Set(tunnelRows);
  for (let row = 0; row < rows; row += 1) {
    if (!tunnelSet.has(row)) {
      continue;
    }
    for (let col = 0; col < cols; col += 1) {
      if (grid[row]![col] !== POWER) {
        continue;
      }
      const mouthCol = nearTunnelMouthCol(col, cols);
      if (!hasTurnBeforeTunnelMouth(grid, col, row, mouthCol)) {
        throw new MazeRejected(`power pellet at tunnel entrance ${col},${row}`);
      }
    }
  }
}

function placePelletsAndSpawn(
  grid: string[][],
  tunnelRows: readonly number[],
  tunnelCells: ReadonlySet<string>,
): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const tunnelSet = new Set(tunnelRows);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (tunnelCells.has(tunnelKey(col, row))) {
        continue;
      }
      if (isPlayerCorridorChar(grid[row]![col]!)) {
        grid[row]![col] = PELLET;
      }
    }
  }

  clearAroundHouseStamp(grid);

  const pelletCells: { col: number; row: number }[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (tunnelCells.has(tunnelKey(col, row))) {
        continue;
      }
      if (grid[row]![col] === PELLET || grid[row]![col] === CORRIDOR) {
        if (corridorDegree(grid, col, row, tunnelSet) >= 2) {
          pelletCells.push({ col, row });
        }
      }
    }
  }

  const cornerTargets: { col: number; row: number }[] = [
    { col: 1, row: 1 },
    { col: cols - 2, row: 1 },
    { col: 1, row: rows - 2 },
    { col: cols - 2, row: rows - 2 },
  ];
  for (const target of cornerTargets) {
    let best: { col: number; row: number } | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const cell of pelletCells) {
      if (grid[cell.row]![cell.col] !== PELLET && grid[cell.row]![cell.col] !== CORRIDOR) {
        continue;
      }
      const dist = Math.abs(cell.col - target.col) + Math.abs(cell.row - target.row);
      const sameHalfCol = cell.col <= cols / 2 === target.col <= cols / 2;
      const sameHalfRow = cell.row <= rows / 2 === target.row <= rows / 2;
      if (!(sameHalfCol && sameHalfRow)) {
        continue;
      }
      if (
        tunnelSet.has(cell.row) &&
        !hasTurnBeforeTunnelMouth(grid, cell.col, cell.row, nearTunnelMouthCol(cell.col, cols))
      ) {
        continue;
      }
      if (dist < bestDist) {
        bestDist = dist;
        best = cell;
      }
    }
    if (!best) {
      throw new MazeRejected("missing power-pellet corner cell");
    }
    grid[best.row]![best.col] = POWER;
  }

  const centerLeft = Math.floor((cols - 1) / 2);
  const centerRight = Math.ceil((cols - 1) / 2);
  let spawn: { col: number; row: number } | null = null;
  for (let row = rows - 2; row >= 1; row -= 1) {
    for (const col of [centerLeft, centerRight]) {
      const ch = grid[row]![col]!;
      if (ch === PELLET || ch === CORRIDOR || ch === POWER) {
        if (!spawn || row > spawn.row || (row === spawn.row && col < spawn.col)) {
          spawn = { col, row };
        }
      }
    }
    if (spawn && spawn.row === row) {
      break;
    }
  }
  if (!spawn) {
    throw new MazeRejected("missing player spawn cell");
  }
  grid[spawn.row]![spawn.col] = SPAWN;
  clearPelletsAround(grid, spawn.col, spawn.row);
  clearPelletsAround(grid, cols - 1 - spawn.col, spawn.row);
}

function clearPelletsAround(grid: string[][], col: number, row: number): void {
  for (const [dc, dr] of [
    [0, 0],
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const) {
    const ch = grid[row + dr]?.[col + dc];
    if (ch === PELLET || ch === POWER) {
      grid[row + dr]![col + dc] = CORRIDOR;
    }
  }
}

export function hasThinInteriorWallSeparator(ascii: string): boolean {
  const lines = ascii.split("\n");
  const rows = lines.length;
  const cols = lines[0]?.length ?? 0;
  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      if (lines[row]![col] !== WALL) {
        continue;
      }
      const left = lines[row]![col - 1]!;
      const right = lines[row]![col + 1]!;
      const up = lines[row - 1]![col]!;
      const down = lines[row + 1]![col]!;
      if (isWalkableChar(left) && isWalkableChar(right)) {
        return true;
      }
      if (isWalkableChar(up) && isWalkableChar(down)) {
        return true;
      }
    }
  }
  return false;
}

function assertSymmetric(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const norm = (ch: string): string => {
    if (ch === " " || ch === SPAWN) {
      return CORRIDOR;
    }
    return ch;
  };
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const mirrorCol = cols - 1 - col;
      const a = norm(grid[row]![col]!);
      const b = norm(grid[row]![mirrorCol]!);
      if (a !== b) {
        throw new MazeRejected(`asymmetric maze at row ${row} cols ${col}/${mirrorCol}`);
      }
    }
  }
}

function assertNoTunnelPellets(
  grid: string[][],
  tunnelCellList: readonly { col: number; row: number }[],
): void {
  for (const { col, row } of tunnelCellList) {
    const ch = grid[row]![col]!;
    if (ch === PELLET || ch === POWER) {
      throw new MazeRejected(`pellet in tunnel at ${col},${row}`);
    }
  }
}

// Power pellets land after clearAroundHouseStamp, so they can still reach these cells.
function assertNoHouseAdjacentPellets(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  for (const { col, row } of houseStampCells()) {
    for (const [dc, dr] of HOUSE_ADJACENT_OFFSETS) {
      const nCol = col + dc;
      const nRow = row + dr;
      if (nCol < 0 || nCol >= cols || nRow < 0 || nRow >= rows || isHouseStampCell(nCol, nRow)) {
        continue;
      }
      const ch = grid[nRow]![nCol]!;
      if (ch === PELLET || ch === POWER) {
        throw new MazeRejected(`pellet adjacent to house stamp at ${nCol},${nRow}`);
      }
    }
  }
}

// A 2x2 block of open cells is exactly the side-by-side-lanes case, and the only one:
// plus/T intersections never form one, so junctions are unaffected.
export function findParallelCorridor(solids: SolidGrid): { col: number; row: number } | null {
  const open = (col: number, row: number): boolean => !(solids[row]?.[col] ?? true);
  for (let row = 0; row < solids.length - 1; row += 1) {
    for (let col = 0; col < (solids[row]?.length ?? 0) - 1; col += 1) {
      if (open(col, row) && open(col + 1, row) && open(col, row + 1) && open(col + 1, row + 1)) {
        return { col, row };
      }
    }
  }
  return null;
}

function assertNoDeadEndsOnLayout(layout: MazeLayout): void {
  const tunnelRows: number[] = [];
  for (let row = 0; row < layout.rows; row += 1) {
    const leftOpen = !(layout.playerSolids[row]?.[0] ?? true);
    const rightOpen = !(layout.playerSolids[row]?.[layout.cols - 1] ?? true);
    if (leftOpen && rightOpen) {
      tunnelRows.push(row);
    }
  }
  const tunnelSet = new Set(tunnelRows);
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      if (layout.playerSolids[row]?.[col]) {
        continue;
      }
      let degree = 0;
      for (const [nCol, nRow] of neighbors(col, row, layout.cols, layout.rows, tunnelSet)) {
        if (!(layout.playerSolids[nRow]?.[nCol] ?? true)) {
          degree += 1;
        }
      }
      if (degree < 2) {
        throw new MazeRejected(`dead-end playerSolids at ${col},${row}`);
      }
    }
  }
}

function countTunnels(grid: string[][]): number[] {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const found: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    if (isWalkableChar(grid[row]![0]!) && isWalkableChar(grid[row]![cols - 1]!)) {
      found.push(row);
    }
  }
  return found;
}

function gridToAscii(grid: string[][]): string {
  return grid.map((row) => row.join("")).join("\n");
}

function reject<T>(build: () => T): T {
  try {
    return build();
  } catch (error) {
    throw new MazeRejected(error instanceof Error ? error.message : String(error));
  }
}

export function boardMazeSeed(runSeed: string, levelIndex: number): string {
  return `${runSeed}:L${levelIndex}`;
}

// Row-reverses a validated board: the player spawn (marked "P") and the ghost house
// stamp move with it, so the player starts near the top and the house door ends up on
// the house's bottom edge. Every generation check is row-permutation invariant, so a
// flip of an already-valid board is itself valid without re-running the retry loop.
export function invertMazeAscii(ascii: string): string {
  return ascii.split("\n").reverse().join("\n");
}

export function generateMazeAscii(seed: string): { ascii: string; pelletCount: number } {
  const tiling = reject(() => solveTiling(seed));
  const grid = emptyGrid(GENERATED_MAZE_COLS, GENERATED_MAZE_ROWS, WALL);
  fillTilingWalls(grid, tiling.pieces);
  stampHouse(grid);

  const houseRows = new Set([...houseStampCells()].map((cell) => cell.row));
  const tunnelRows = pickTunnelRows(seed, houseRows);
  const carvedTunnelCells = applyTunnels(grid, tunnelRows);
  sealDeadEnds(grid);

  const tunnels = countTunnels(grid);
  if (tunnels.length < 1 || tunnels.length > 2) {
    throw new MazeRejected(`tunnel count ${tunnels.length}`);
  }

  const tunnelRowSet = new Set(tunnels);
  const tunnelCellList = carvedTunnelCells.filter((cell) => tunnelRowSet.has(cell.row));
  const tunnelCells = new Set(tunnelCellList.map(({ col, row }) => tunnelKey(col, row)));

  placePelletsAndSpawn(grid, tunnels, tunnelCells);

  assertSymmetric(grid);
  assertNoHouseAdjacentPellets(grid);
  assertNoTunnelPellets(grid, tunnelCellList);
  assertPowerPelletsHaveTunnelTurn(grid, tunnels);

  const ascii = gridToAscii(grid);
  if (hasThinInteriorWallSeparator(ascii)) {
    throw new MazeRejected("thin interior wall separator");
  }
  if ((ascii.match(/@/g) ?? []).length !== 4) {
    throw new MazeRejected("expected 4 power pellets");
  }

  const layout = reject(() => layoutFromAscii(ascii));
  for (const row of tunnels) {
    const mouths = layout.playerSolids[row];
    if ((mouths?.[0] ?? true) || (mouths?.[layout.cols - 1] ?? true)) {
      throw new MazeRejected(`unreachable tunnel row ${row}`);
    }
  }
  assertNoDeadEndsOnLayout(layout);
  const parallel = findParallelCorridor(layout.playerSolids);
  if (parallel) {
    throw new MazeRejected(`parallel corridors at ${parallel.col},${parallel.row}`);
  }
  if (layout.pelletCount < 120) {
    throw new MazeRejected(`too few pellets ${layout.pelletCount}`);
  }

  return { ascii, pelletCount: layout.pelletCount };
}

export function generateMazeAsciiWithRetries(
  seed: string,
  maxAttempts: number = GENERATE_MAX_ATTEMPTS,
): { ascii: string; seedUsed: string } | null {
  let best: { ascii: string; seedUsed: string; pelletCount: number } | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seedUsed = attempt === 0 ? seed : `${seed}#${attempt}`;
    let board: { ascii: string; pelletCount: number };
    try {
      board = generateMazeAscii(seedUsed);
    } catch (error) {
      if (!(error instanceof MazeRejected)) {
        throw error;
      }
      continue;
    }
    if (board.pelletCount >= GENERATED_PELLET_TARGET) {
      return { ascii: board.ascii, seedUsed };
    }
    if (!best || board.pelletCount > best.pelletCount) {
      best = { ascii: board.ascii, seedUsed, pelletCount: board.pelletCount };
    }
  }
  return best ? { ascii: best.ascii, seedUsed: best.seedUsed } : null;
}

export type BoardSelection =
  { kind: "static"; id: MazeLayoutId } | { kind: "generate"; seed: string };

export function resolveBoardSelection(
  levelIndex: number,
  layoutOverride: MazeLayoutId | null,
  runMazeSeed: string,
): BoardSelection {
  if (layoutOverride !== null) {
    return { kind: "static", id: layoutOverride };
  }
  if (levelIndex <= 1) {
    return { kind: "static", id: pickLayoutId(() => 0, null, levelIndex) };
  }
  return { kind: "generate", seed: boardMazeSeed(runMazeSeed, levelIndex) };
}
