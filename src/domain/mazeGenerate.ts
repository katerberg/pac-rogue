import { computeMazeGeometry, layoutFromAscii, type MazeLayout } from "./maze";
import { pickLayoutId, type MazeLayoutId } from "./mazeLayouts";
import {
  randomFromSeed,
  solveTiling,
  TILING_HEIGHT,
  TILING_WIDTH,
  type TilingPiece,
} from "./mazeTiling";

export const GENERATED_MAZE_COLS = 28;
export const GENERATED_MAZE_ROWS = 31;
export const GENERATE_MAX_ATTEMPTS = 32;

const WALL = "#";
const CORRIDOR = "-";
const PELLET = ".";
const POWER = "@";
const DOOR = "=";
const HOUSE = "H";
const SPAWN = "P";

const HOUSE_STAMP: readonly string[] = ["###==###", "#HHHHHH#", "#HHHHHH#", "#HHHHHH#", "########"];
const HOUSE_STAMP_COL0 = 10;
const HOUSE_STAMP_ROW0 = 12;

function emptyGrid(cols: number, rows: number, fill: string): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function solverCellOrigin(sx: number, sy: number): { col: number; row: number } {
  return { col: 1 + sx * 3, row: 1 + sy * 3 };
}

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

function clearAroundHouseStamp(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const stampCells: { col: number; row: number }[] = [];
  for (let r = 0; r < HOUSE_STAMP.length; r += 1) {
    for (let c = 0; c < HOUSE_STAMP[r]!.length; c += 1) {
      stampCells.push({ col: HOUSE_STAMP_COL0 + c, row: HOUSE_STAMP_ROW0 + r });
    }
  }
  for (const cell of stampCells) {
    for (const [dc, dr] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nCol = cell.col + dc;
      const nRow = cell.row + dr;
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

function pickTunnelRows(seed: string, houseRows: Set<number>): number[] {
  const random = randomFromSeed(`tunnels:${seed}`);
  const powerRows = new Set([1, GENERATED_MAZE_ROWS - 2]);
  const candidates: number[] = [];
  for (let row = 2; row < GENERATED_MAZE_ROWS - 2; row += 1) {
    if (powerRows.has(row) || houseRows.has(row)) {
      continue;
    }
    candidates.push(row);
  }
  if (candidates.length === 0) {
    throw new Error("no tunnel candidate rows");
  }
  const count = random() < 0.5 ? 1 : 2;
  const chosen: number[] = [];
  const pool = [...candidates];
  while (chosen.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length);
    const row = pool.splice(index, 1)[0]!;
    if (chosen.some((existing) => Math.abs(existing - row) <= 1)) {
      continue;
    }
    chosen.push(row);
  }
  if (chosen.length === 0) {
    chosen.push(candidates[Math.floor(random() * candidates.length)]!);
  }
  return chosen.sort((a, b) => a - b);
}

function applyTunnels(grid: string[][], tunnelRows: readonly number[]): void {
  const cols = grid[0]!.length;
  for (const row of tunnelRows) {
    grid[row]![0] = CORRIDOR;
    grid[row]![cols - 1] = CORRIDOR;
    for (let col = 1; col < cols - 1; col += 1) {
      if (isWalkableChar(grid[row]![col]!)) {
        break;
      }
      grid[row]![col] = CORRIDOR;
      grid[row]![cols - 1 - col] = CORRIDOR;
    }
  }
}

function neighborKeys(
  col: number,
  row: number,
  cols: number,
  rows: number,
  tunnelRows: ReadonlySet<number>,
): string[] {
  const keys: string[] = [];
  const push = (c: number, r: number) => {
    keys.push(`${c},${r}`);
  };
  if (row > 0) {
    push(col, row - 1);
  }
  if (row + 1 < rows) {
    push(col, row + 1);
  }
  if (col > 0) {
    push(col - 1, row);
  } else if (tunnelRows.has(row)) {
    push(cols - 1, row);
  }
  if (col + 1 < cols) {
    push(col + 1, row);
  } else if (tunnelRows.has(row)) {
    push(0, row);
  }
  return keys;
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
  for (const nKey of neighborKeys(col, row, cols, rows, tunnelRows)) {
    const [nCol, nRow] = nKey.split(",").map(Number) as [number, number];
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
      throw new Error("sealDeadEnds did not converge");
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

function carveHouseApproach(grid: string[][]): void {
  const doorMidCol = HOUSE_STAMP_COL0 + 3;
  const exitRow = HOUSE_STAMP_ROW0 - 1;
  const fruitRow = HOUSE_STAMP_ROW0 + HOUSE_STAMP.length;
  const cols = grid[0]!.length;
  if (exitRow > 0) {
    for (let col = HOUSE_STAMP_COL0; col < HOUSE_STAMP_COL0 + HOUSE_STAMP[0]!.length; col += 1) {
      if (grid[exitRow]![col] === WALL) {
        grid[exitRow]![col] = CORRIDOR;
      }
    }
  }
  if (fruitRow < grid.length - 1) {
    for (let col = HOUSE_STAMP_COL0; col < HOUSE_STAMP_COL0 + HOUSE_STAMP[0]!.length; col += 1) {
      if (grid[fruitRow]![col] === WALL) {
        grid[fruitRow]![col] = CORRIDOR;
      }
    }
  }
  for (const row of [exitRow, fruitRow]) {
    if (row <= 0 || row >= grid.length - 1) {
      continue;
    }
    for (const col of [doorMidCol, doorMidCol + 1, HOUSE_STAMP_COL0 - 1, cols - HOUSE_STAMP_COL0]) {
      if (col > 0 && col < cols - 1 && grid[row]![col] === WALL) {
        grid[row]![col] = CORRIDOR;
      }
    }
  }
}

function placePelletsAndSpawn(grid: string[][], tunnelRows: readonly number[]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const tunnelSet = new Set(tunnelRows);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (isPlayerCorridorChar(grid[row]![col]!)) {
        grid[row]![col] = PELLET;
      }
    }
  }

  clearAroundHouseStamp(grid);

  const pelletCells: { col: number; row: number }[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
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
      if (dist < bestDist) {
        bestDist = dist;
        best = cell;
      }
    }
    if (!best) {
      throw new Error("missing power-pellet corner cell");
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
    throw new Error("missing player spawn cell");
  }
  grid[spawn.row]![spawn.col] = SPAWN;
  const mirrorCol = cols - 1 - spawn.col;
  if (mirrorCol !== spawn.col) {
    const mirrorCh = grid[spawn.row]![mirrorCol]!;
    if (mirrorCh === PELLET || mirrorCh === POWER || mirrorCh === SPAWN) {
      grid[spawn.row]![mirrorCol] = CORRIDOR;
    }
  }

  breakPelletBlocks(grid);
}

function breakPelletBlocks(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  let changed = true;
  while (changed) {
    changed = false;
    for (let row = 0; row < rows - 1; row += 1) {
      for (let col = 0; col < Math.ceil(cols / 2); col += 1) {
        const cells = [
          { c: col, r: row },
          { c: col + 1, r: row },
          { c: col, r: row + 1 },
          { c: col + 1, r: row + 1 },
        ];
        if (
          cells.every(({ c, r }) => {
            const ch = grid[r]![c]!;
            return ch === PELLET || ch === POWER;
          })
        ) {
          const target = cells.find(({ c, r }) => grid[r]![c] === PELLET);
          if (!target) {
            continue;
          }
          grid[target.r]![target.c] = CORRIDOR;
          const mirrorCol = cols - 1 - target.c;
          if (mirrorCol !== target.c && grid[target.r]![mirrorCol] === PELLET) {
            grid[target.r]![mirrorCol] = CORRIDOR;
          }
          changed = true;
        }
      }
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
        throw new Error(`asymmetric maze at row ${row} cols ${col}/${mirrorCol}`);
      }
    }
  }
}

function assertNoPelletBlocks(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const cells = [
        grid[row]![col]!,
        grid[row]![col + 1]!,
        grid[row + 1]![col]!,
        grid[row + 1]![col + 1]!,
      ];
      if (cells.every((ch) => ch === PELLET || ch === POWER)) {
        throw new Error(`pellet block at ${col},${row}`);
      }
    }
  }
}

function assertNoHouseAdjacentPellets(grid: string[][]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  for (let row = HOUSE_STAMP_ROW0; row < HOUSE_STAMP_ROW0 + HOUSE_STAMP.length; row += 1) {
    for (let col = HOUSE_STAMP_COL0; col < HOUSE_STAMP_COL0 + HOUSE_STAMP[0]!.length; col += 1) {
      for (const [dc, dr] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ] as const) {
        const nCol = col + dc;
        const nRow = row + dr;
        if (nCol < 0 || nCol >= cols || nRow < 0 || nRow >= rows) {
          continue;
        }
        if (
          nRow >= HOUSE_STAMP_ROW0 &&
          nRow < HOUSE_STAMP_ROW0 + HOUSE_STAMP.length &&
          nCol >= HOUSE_STAMP_COL0 &&
          nCol < HOUSE_STAMP_COL0 + HOUSE_STAMP[0]!.length
        ) {
          continue;
        }
        const ch = grid[nRow]![nCol]!;
        if (ch === PELLET || ch === POWER) {
          throw new Error(`pellet adjacent to house stamp at ${nCol},${nRow}`);
        }
      }
    }
  }
}

function assertNoDeadEnds(grid: string[][], tunnelRows: readonly number[]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  const tunnelSet = new Set(tunnelRows);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isPlayerCorridorChar(grid[row]![col]!)) {
        continue;
      }
      if (corridorDegree(grid, col, row, tunnelSet) < 2) {
        throw new Error(`dead-end walkable at ${col},${row}`);
      }
    }
  }
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
      for (const nKey of neighborKeys(col, row, layout.cols, layout.rows, tunnelSet)) {
        const [nCol, nRow] = nKey.split(",").map(Number) as [number, number];
        if (!(layout.playerSolids[nRow]?.[nCol] ?? true)) {
          degree += 1;
        }
      }
      if (degree < 2) {
        throw new Error(`dead-end playerSolids at ${col},${row}`);
      }
    }
  }
}

function assertTunnelsReachable(grid: string[][], tunnelRows: readonly number[]): void {
  const rows = grid.length;
  const cols = grid[0]!.length;
  let spawn: { col: number; row: number } | null = null;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (grid[row]![col] === SPAWN) {
        spawn = { col, row };
      }
    }
  }
  if (!spawn) {
    throw new Error("missing spawn for tunnel reachability");
  }
  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const queue = [spawn];
  visited[spawn.row]![spawn.col] = true;
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const [dc, dr] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const col = current.col + dc;
      const row = current.row + dr;
      if (col < 0 || col >= cols || row < 0 || row >= rows) {
        continue;
      }
      if (visited[row]![col]) {
        continue;
      }
      const ch = grid[row]![col]!;
      if (!(isWalkableChar(ch) || ch === DOOR || ch === HOUSE)) {
        continue;
      }
      visited[row]![col] = true;
      queue.push({ col, row });
    }
  }
  for (const row of tunnelRows) {
    if (!visited[row]![0] || !visited[row]![cols - 1]) {
      throw new Error(`unreachable tunnel row ${row}`);
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

export function boardMazeSeed(runSeed: string, levelIndex: number): string {
  return `${runSeed}:L${levelIndex}`;
}

export function generateMazeAscii(seed: string): string {
  const tiling = solveTiling(seed);
  const grid = emptyGrid(GENERATED_MAZE_COLS, GENERATED_MAZE_ROWS, WALL);
  fillTilingWalls(grid, tiling.pieces);
  stampHouse(grid);
  carveHouseApproach(grid);

  const houseRows = new Set<number>();
  for (let r = HOUSE_STAMP_ROW0; r < HOUSE_STAMP_ROW0 + HOUSE_STAMP.length; r += 1) {
    houseRows.add(r);
  }
  const tunnelRows = pickTunnelRows(seed, houseRows);
  applyTunnels(grid, tunnelRows);
  sealDeadEnds(grid);

  const sealedTunnels = countTunnels(grid);
  if (sealedTunnels.length < 1 || sealedTunnels.length > 2) {
    throw new Error(`tunnel count after seal ${sealedTunnels.length}`);
  }
  for (let i = 0; i < sealedTunnels.length - 1; i += 1) {
    if (sealedTunnels[i + 1]! - sealedTunnels[i]! <= 1) {
      throw new Error("adjacent tunnels after seal");
    }
  }

  placePelletsAndSpawn(grid, sealedTunnels);

  assertSymmetric(grid);
  assertNoPelletBlocks(grid);
  assertNoHouseAdjacentPellets(grid);
  const tunnels = countTunnels(grid);
  if (tunnels.length < 1 || tunnels.length > 2) {
    throw new Error(`tunnel count ${tunnels.length}`);
  }
  for (let i = 0; i < tunnels.length - 1; i += 1) {
    if (tunnels[i + 1]! - tunnels[i]! <= 1) {
      throw new Error("adjacent tunnels");
    }
  }
  assertNoDeadEnds(grid, tunnels);
  assertTunnelsReachable(grid, tunnels);

  const ascii = gridToAscii(grid);
  if (hasThinInteriorWallSeparator(ascii)) {
    throw new Error("thin interior wall separator");
  }
  computeMazeGeometry(GENERATED_MAZE_COLS, GENERATED_MAZE_ROWS);
  if (!ascii.includes(SPAWN)) {
    throw new Error("missing P spawn");
  }
  if ((ascii.match(/@/g) ?? []).length !== 4) {
    throw new Error("expected 4 power pellets");
  }

  const layout = layoutFromAscii(ascii);
  assertNoDeadEndsOnLayout(layout);
  if (layout.pelletCount < 120) {
    throw new Error(`too few pellets ${layout.pelletCount}`);
  }

  return ascii;
}

export function generateMazeAsciiWithRetries(
  seed: string,
  maxAttempts: number = GENERATE_MAX_ATTEMPTS,
): { ascii: string; seedUsed: string } | null {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seedUsed = attempt === 0 ? seed : `${seed}#${attempt}`;
    try {
      const ascii = generateMazeAscii(seedUsed);
      return { ascii, seedUsed };
    } catch {
      continue;
    }
  }
  return null;
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
