import {
  getActiveLayout,
  inBounds,
  isDoor,
  isHouse,
  isWalkable,
  type MazeLayout,
  type MazeTile,
  type SolidGrid,
} from "./maze";

export const TUNNEL_BORING_CHARGES_PER_LEVEL = 1;

const EMPTY_CORRIDOR_CHAR = "-";
const WALL_CHAR = "#";

const NEIGHBORS: readonly MazeTile[] = [
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
];

function mutableGrid(grid: SolidGrid): boolean[][] {
  return grid as boolean[][];
}

function blocksGhostHouse(cell: MazeTile, layout: MazeLayout): boolean {
  if (isHouse(cell.col, cell.row, layout.house) || isDoor(cell.col, cell.row, layout.door)) {
    return true;
  }
  const exit = layout.ghostHouseExit;
  if (cell.col === exit.col && cell.row === exit.row) {
    return true;
  }
  return NEIGHBORS.some(({ col: dx, row: dy }) => {
    const nCol = cell.col + dx;
    const nRow = cell.row + dy;
    return isHouse(nCol, nRow, layout.house) || isDoor(nCol, nRow, layout.door);
  });
}

function rowHasHorizontalTunnel(row: number, layout: MazeLayout): boolean {
  return (
    isWalkable(0, row, layout.playerSolids) && isWalkable(layout.cols - 1, row, layout.playerSolids)
  );
}

/** Adjacent tunnel rows crash layout activate — refuse a new wrap on those rows. */
function wouldCreateAdjacentHorizontalTunnel(row: number, layout: MazeLayout): boolean {
  if (rowHasHorizontalTunnel(row, layout)) {
    return false;
  }
  for (const adj of [row - 1, row + 1]) {
    if (adj >= 0 && adj < layout.rows && rowHasHorizontalTunnel(adj, layout)) {
      return true;
    }
  }
  return false;
}

function isSinkholeCell(col: number, row: number, layout: MazeLayout): boolean {
  return layout.ghostActiveSolids[row]?.[col] === false;
}

function punchSolidRun(
  startCol: number,
  startRow: number,
  dx: number,
  dy: number,
  layout: MazeLayout,
): { cells: MazeTile[]; hitCorridor: boolean; exitedMap: boolean } | null {
  const cells: MazeTile[] = [];
  let col = startCol;
  let row = startRow;
  while (inBounds(col, row)) {
    if (isWalkable(col, row, layout.playerSolids)) {
      return { cells, hitCorridor: true, exitedMap: false };
    }
    if (blocksGhostHouse({ col, row }, layout) || isSinkholeCell(col, row, layout)) {
      return null;
    }
    cells.push({ col, row });
    col += dx;
    row += dy;
  }
  return { cells, hitCorridor: false, exitedMap: true };
}

function thinWallKeys(ascii: string): Set<string> {
  const grid = ascii.split("\n");
  const isWall = (col: number, row: number): boolean => {
    const line = grid[row];
    return line === undefined || line[col] === undefined || line[col] === WALL_CHAR;
  };
  const thin = new Set<string>();
  grid.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      if (!isWall(col, row)) {
        continue;
      }
      const inBlock = [-1, 0].some((dRow) =>
        [-1, 0].some((dCol) =>
          [0, 1].every((i) => [0, 1].every((j) => isWall(col + dCol + i, row + dRow + j))),
        ),
      );
      if (!inBlock) {
        thin.add(`${col},${row}`);
      }
    }
  });
  return thin;
}

/** A bore may not leave any wall cell outside a 2x2 wall block (no single-line walls). */
function leavesThinWall(ascii: string, cells: readonly MazeTile[]): boolean {
  const before = thinWallKeys(ascii);
  for (const key of thinWallKeys(applyTunnelBoringAscii(ascii, cells))) {
    if (!before.has(key)) {
      return true;
    }
  }
  return false;
}

export function mergeBoredCells(prior: readonly MazeTile[], next: readonly MazeTile[]): MazeTile[] {
  const seen = new Set<string>();
  const out: MazeTile[] = [];
  for (const cell of [...prior, ...next]) {
    const key = `${cell.col},${cell.row}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(cell);
  }
  return out;
}

/**
 * Cells to open for one bore press. Punches through consecutive walls until a
 * corridor. At the map edge, also opens the opposite edge (wrap tunnel).
 */
export function tunnelBoringCells(
  col: number,
  row: number,
  dx: number,
  dy: number,
  layout: MazeLayout = getActiveLayout(),
): MazeTile[] | null {
  const cells = boreRun(col, row, dx, dy, layout);
  return cells === null || leavesThinWall(layout.ascii, cells) ? null : cells;
}

function boreRun(
  col: number,
  row: number,
  dx: number,
  dy: number,
  layout: MazeLayout = getActiveLayout(),
): MazeTile[] | null {
  if (dx === 0 && dy === 0) {
    return null;
  }
  const first = { col: col + dx, row: row + dy };
  if (!inBounds(first.col, first.row)) {
    return null;
  }
  if (isWalkable(first.col, first.row, layout.playerSolids)) {
    return null;
  }

  const near = punchSolidRun(first.col, first.row, dx, dy, layout);
  if (near === null || near.cells.length === 0) {
    return null;
  }

  if (near.hitCorridor) {
    return near.cells;
  }

  if (!near.exitedMap) {
    return null;
  }

  const edge = near.cells[near.cells.length - 1]!;
  if (dy === 0 && wouldCreateAdjacentHorizontalTunnel(edge.row, layout)) {
    return null;
  }

  const farStartCol = dx !== 0 ? (dx > 0 ? 0 : layout.cols - 1) : edge.col;
  const farStartRow = dy !== 0 ? (dy > 0 ? 0 : layout.rows - 1) : edge.row;
  const far = punchSolidRun(farStartCol, farStartRow, dx, dy, layout);
  if (far === null) {
    return null;
  }
  return mergeBoredCells(near.cells, far.cells);
}

export function applyTunnelBoringAscii(ascii: string, cells: readonly MazeTile[]): string {
  if (cells.length === 0) {
    return ascii;
  }
  const lines = ascii.split("\n").map((line) => [...line]);
  for (const cell of cells) {
    const row = lines[cell.row];
    if (row === undefined || row[cell.col] === undefined) {
      continue;
    }
    if (row[cell.col] === WALL_CHAR) {
      row[cell.col] = EMPTY_CORRIDOR_CHAR;
    }
  }
  return lines.map((line) => line.join("")).join("\n");
}

export function openBoredCellsOnLayout(layout: MazeLayout, cells: readonly MazeTile[]): MazeLayout {
  if (cells.length === 0) {
    return layout;
  }
  const grids = [
    mutableGrid(layout.walls),
    mutableGrid(layout.exterior),
    mutableGrid(layout.ghostSolids),
    mutableGrid(layout.playerSolids),
    mutableGrid(layout.ghostActiveSolids),
    mutableGrid(layout.wallPassPlayerSolids),
    mutableGrid(layout.wallPassLoopPlayerSolids),
  ];
  for (const cell of cells) {
    if (!inBounds(cell.col, cell.row)) {
      continue;
    }
    for (const grid of grids) {
      const row = grid[cell.row];
      if (row !== undefined) {
        row[cell.col] = false;
      }
    }
  }
  return layout;
}

export const TUNNEL_BORING_SPEED_MUL = 0.75;
export const TUNNEL_BORE_STEP_MS = 360;

export type BoreProgress = {
  steps: readonly (readonly MazeTile[])[];
  opened: number;
  elapsedMs: number;
  dx: number;
  dy: number;
};

function adjacent(a: MazeTile, b: MazeTile): boolean {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;
}

export function boreSteps(cells: readonly MazeTile[]): MazeTile[][] {
  const steps: MazeTile[][] = [];
  cells.forEach((cell, index) => {
    const prev = cells[index - 1];
    const last = steps[steps.length - 1];
    if (prev !== undefined && last !== undefined && !adjacent(prev, cell)) {
      last.push(cell);
    } else {
      steps.push([cell]);
    }
  });
  return steps;
}

export function startBore(cells: readonly MazeTile[], dx: number, dy: number): BoreProgress {
  return { steps: boreSteps(cells), opened: 1, elapsedMs: 0, dx, dy };
}

function boreStepAt(progress: BoreProgress, at: MazeTile | null): number {
  if (at === null) {
    return -1;
  }
  return progress.steps.findIndex((step) =>
    step.some((cell) => cell.col === at.col && cell.row === at.row),
  );
}

export function advanceBore(
  progress: BoreProgress,
  deltaMs: number,
  at: MazeTile | null,
): BoreProgress {
  const elapsedMs = progress.elapsedMs + deltaMs;
  const timed = 1 + Math.floor(elapsedMs / TUNNEL_BORE_STEP_MS);
  const reached = boreStepAt(progress, at) + 2;
  const opened = Math.min(progress.steps.length, Math.max(progress.opened, timed, reached));
  return { ...progress, elapsedMs, opened };
}

export function boreCellsOpened(progress: BoreProgress, fromStep = 0): MazeTile[] {
  return progress.steps.slice(fromStep, progress.opened).flat();
}

export function boreSettled(progress: BoreProgress, at: MazeTile | null): boolean {
  return progress.opened === progress.steps.length && boreStepAt(progress, at) < 0;
}

export function boringSpeedMultiplier(progress: BoreProgress | null, at: MazeTile | null): number {
  return progress !== null && boreStepAt(progress, at) >= 0 ? TUNNEL_BORING_SPEED_MUL : 1;
}
