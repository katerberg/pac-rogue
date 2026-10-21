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

export function tunnelBoringTarget(
  col: number,
  row: number,
  dx: number,
  dy: number,
  layout: MazeLayout = getActiveLayout(),
): MazeTile | null {
  if (dx === 0 && dy === 0) {
    return null;
  }
  const target = { col: col + dx, row: row + dy };
  if (!inBounds(target.col, target.row)) {
    return null;
  }
  if (isWalkable(target.col, target.row, layout.playerSolids)) {
    return null;
  }
  if (blocksGhostHouse(target, layout)) {
    return null;
  }
  return target;
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
