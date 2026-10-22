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
    if (blocksGhostHouse({ col, row }, layout)) {
      return null;
    }
    cells.push({ col, row });
    col += dx;
    row += dy;
  }
  return { cells, hitCorridor: false, exitedMap: true };
}

function dedupeCells(cells: readonly MazeTile[]): MazeTile[] {
  const seen = new Set<string>();
  const out: MazeTile[] = [];
  for (const cell of cells) {
    const key = `${cell.col},${cell.row}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(cell);
  }
  return out;
}

export function mergeBoredCells(prior: readonly MazeTile[], next: readonly MazeTile[]): MazeTile[] {
  return dedupeCells([...prior, ...next]);
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

  let farStartCol: number;
  let farStartRow: number;
  let inwardDx: number;
  let inwardDy: number;
  if (dx > 0) {
    farStartCol = 0;
    farStartRow = edge.row;
    inwardDx = 1;
    inwardDy = 0;
  } else if (dx < 0) {
    farStartCol = layout.cols - 1;
    farStartRow = edge.row;
    inwardDx = -1;
    inwardDy = 0;
  } else if (dy > 0) {
    farStartCol = edge.col;
    farStartRow = 0;
    inwardDx = 0;
    inwardDy = 1;
  } else {
    farStartCol = edge.col;
    farStartRow = layout.rows - 1;
    inwardDx = 0;
    inwardDy = -1;
  }

  const far = punchSolidRun(farStartCol, farStartRow, inwardDx, inwardDy, layout);
  if (far === null) {
    return null;
  }
  return dedupeCells([...near.cells, ...far.cells]);
}

export function tunnelBoringTarget(
  col: number,
  row: number,
  dx: number,
  dy: number,
  layout: MazeLayout = getActiveLayout(),
): MazeTile | null {
  const cells = tunnelBoringCells(col, row, dx, dy, layout);
  return cells?.[0] ?? null;
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

export function tunnelBoringChargesForBoard(owned: boolean): number {
  return owned ? TUNNEL_BORING_CHARGES_PER_LEVEL : 0;
}
