import { expiryTintOn } from "./expiryBlink";
import {
  getActiveLayout,
  inBounds,
  isDoor,
  isWalkable,
  type MazeLayout,
  type MazeTile,
  type SolidGrid,
} from "./maze";

export type CardinalStep = { dx: number; dy: number };

export type DroppedWall = MazeTile & { remainingMs: number; passable: boolean };

export const WALL_DROP_MS = 8000;
export const PASSABLE_WALL_ALPHA = 0.45;

const NEIGHBORS: readonly CardinalStep[] = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

function blocksGhostHouse(cell: MazeTile, layout: MazeLayout): boolean {
  const exit = layout.ghostHouseExit;
  if (cell.col === exit.col && cell.row === exit.row) {
    return true;
  }
  return NEIGHBORS.some(({ dx, dy }) => isDoor(cell.col + dx, cell.row + dy, layout.door));
}

export function wallDropCell(
  col: number,
  row: number,
  before: CardinalStep | undefined,
  after: CardinalStep | undefined,
  layout: MazeLayout = getActiveLayout(),
): MazeTile | null {
  if (before === undefined || after === undefined) {
    return null;
  }
  if (before.dx !== -after.dx || before.dy !== -after.dy) {
    return null;
  }
  const cell = { col: col + before.dx, row: row + before.dy };
  if (
    !inBounds(cell.col, cell.row) ||
    !isWalkable(cell.col, cell.row, layout.playerSolids) ||
    blocksGhostHouse(cell, layout)
  ) {
    return null;
  }
  return cell;
}

export function withSolidCell(solids: SolidGrid, cell: MazeTile | null): SolidGrid {
  if (cell === null) {
    return solids;
  }
  return solids.map((cells, row) =>
    row === cell.row ? cells.map((solid, col) => solid || col === cell.col) : cells,
  );
}

export function droppedWallAlpha(wall: DroppedWall, nowMs: number): number {
  if (wall.passable) {
    return PASSABLE_WALL_ALPHA;
  }
  return expiryTintOn(wall.remainingMs, nowMs) ? 1 : 0;
}
