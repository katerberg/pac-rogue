import {
  actorDisplaySize,
  getActiveLayout,
  isDoor,
  isWalkable,
  type MazeLayout,
  type MazeTile,
  type SolidGrid,
} from "./maze";

export type CardinalStep = { dx: number; dy: number };

export type DroppedWall = MazeTile & {
  remainingMs: number;
  passable: boolean;
  awayStep: CardinalStep;
  vacated: boolean;
};

export type WallDropSpot = MazeTile & { awayStep: CardinalStep };

export const WALL_DROP_MS = 8000;
export const PASSABLE_WALL_ALPHA = 0.45;
export const WALL_DROP_BLINK_WINDOW_MS = 2000;
export const WALL_DROP_BLINK_PERIOD_MS = 150;
export const DROPPED_WALL_COLOR = 0xffec00;

export type DroppedWallLook = { color: number; alpha: number; size: number; cornerRadius: number };

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

export function wallDropSpot(
  col: number,
  row: number,
  before: CardinalStep | undefined,
  after: CardinalStep | undefined,
  layout: MazeLayout = getActiveLayout(),
): WallDropSpot | null {
  if (before === undefined || after === undefined) {
    return null;
  }
  if (before.dx !== -after.dx || before.dy !== -after.dy) {
    return null;
  }
  if (!isWalkable(col, row, layout.playerSolids) || blocksGhostHouse({ col, row }, layout)) {
    return null;
  }
  return { col, row, awayStep: after };
}

export function ghostStepBlockedByWall(
  wall: DroppedWall | null,
  col: number,
  row: number,
  dx: number,
  dy: number,
): boolean {
  if (wall === null) {
    return false;
  }
  const entering = col + dx === wall.col && row + dy === wall.row;
  const leavingTowardPlayer =
    col === wall.col && row === wall.row && dx === wall.awayStep.dx && dy === wall.awayStep.dy;
  return entering || leavingTowardPlayer;
}

export function withSolidCell(solids: SolidGrid, cell: MazeTile | null): SolidGrid {
  if (cell === null) {
    return solids;
  }
  return solids.map((cells, row) =>
    row === cell.row ? cells.map((solid, col) => solid || col === cell.col) : cells,
  );
}

export function droppedWallLook(
  wall: DroppedWall,
  nowMs: number,
  wallCornerRadius: number,
  size: number = actorDisplaySize(),
): DroppedWallLook {
  const blinkOff =
    wall.remainingMs <= WALL_DROP_BLINK_WINDOW_MS &&
    Math.floor(nowMs / WALL_DROP_BLINK_PERIOD_MS) % 2 === 1;
  const solidAlpha = blinkOff ? 0 : 1;
  return {
    color: DROPPED_WALL_COLOR,
    alpha: wall.passable ? PASSABLE_WALL_ALPHA : solidAlpha,
    size,
    cornerRadius: Math.min(wallCornerRadius, size / 2),
  };
}
