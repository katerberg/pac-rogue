import { agentLog } from "../debug/agentLog";
import { canEnterDirection, worldToCol, worldToRow, type SolidGrid } from "./maze";

export const GHOST_DIR = {
  none: 0,
  up: 1,
  down: 2,
  left: 3,
  right: 4,
} as const;

export type GhostDir = (typeof GHOST_DIR)[keyof typeof GHOST_DIR];

const TIE_ORDER: readonly GhostDir[] = [
  GHOST_DIR.up,
  GHOST_DIR.left,
  GHOST_DIR.down,
  GHOST_DIR.right,
];

type Step = { dx: number; dy: number };

function directionStep(direction: GhostDir): Step {
  switch (direction) {
    case GHOST_DIR.up:
      return { dx: 0, dy: -1 };
    case GHOST_DIR.down:
      return { dx: 0, dy: 1 };
    case GHOST_DIR.left:
      return { dx: -1, dy: 0 };
    case GHOST_DIR.right:
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}

export function reverseGhostDir(direction: GhostDir): GhostDir {
  switch (direction) {
    case GHOST_DIR.up:
      return GHOST_DIR.down;
    case GHOST_DIR.down:
      return GHOST_DIR.up;
    case GHOST_DIR.left:
      return GHOST_DIR.right;
    case GHOST_DIR.right:
      return GHOST_DIR.left;
    default:
      return GHOST_DIR.none;
  }
}

export type GhostCanEnter = (x: number, y: number, dx: number, dy: number) => boolean;

export function openGhostDirsAt(
  x: number,
  y: number,
  solids: SolidGrid,
  canEnter?: GhostCanEnter,
): GhostDir[] {
  const enter = canEnter ?? ((px, py, dx, dy) => canEnterDirection(px, py, dx, dy, solids));
  const opens: GhostDir[] = [];
  for (const dir of TIE_ORDER) {
    const { dx, dy } = directionStep(dir);
    if (enter(x, y, dx, dy)) {
      opens.push(dir);
    }
  }
  return opens;
}

export function isPerpendicularLCorner(opens: readonly GhostDir[]): boolean {
  if (opens.length !== 2) {
    return false;
  }
  return reverseGhostDir(opens[0]!) !== opens[1];
}

export function lCornerTurnDir(opens: readonly GhostDir[], facing: GhostDir): GhostDir {
  if (!isPerpendicularLCorner(opens) || facing === GHOST_DIR.none) {
    return GHOST_DIR.none;
  }
  const back = reverseGhostDir(facing);
  if (!opens.includes(back)) {
    return GHOST_DIR.none;
  }
  return opens.find((dir) => dir !== back) ?? GHOST_DIR.none;
}

export function pickGhostDirection(args: {
  x: number;
  y: number;
  facing: GhostDir;
  targetCol: number;
  targetRow: number;
  solids: SolidGrid;
  canEnter?: GhostCanEnter;
}): GhostDir {
  const enter =
    args.canEnter ?? ((px, py, dx, dy) => canEnterDirection(px, py, dx, dy, args.solids));
  const opens = openGhostDirsAt(args.x, args.y, args.solids, enter);
  const isL = isPerpendicularLCorner(opens);
  const forcedTurn = lCornerTurnDir(opens, args.facing);
  if (forcedTurn !== GHOST_DIR.none) {
    // #region agent log
    agentLog({
      hypothesisId: "C",
      location: "ghostPath.ts:pickGhostDirection",
      message: "L forced turn",
      data: {
        col: worldToCol(args.x),
        row: worldToRow(args.y),
        facing: args.facing,
        opens,
        forcedTurn,
        targetCol: args.targetCol,
        targetRow: args.targetRow,
      },
    });
    // #endregion
    return forcedTurn;
  }

  const candidates: GhostDir[] = [];
  for (const dir of TIE_ORDER) {
    const { dx, dy } = directionStep(dir);
    if (!enter(args.x, args.y, dx, dy)) {
      continue;
    }
    if (args.facing !== GHOST_DIR.none && reverseGhostDir(args.facing) === dir) {
      continue;
    }
    candidates.push(dir);
  }

  if (candidates.length === 0) {
    if (args.facing !== GHOST_DIR.none) {
      const back = reverseGhostDir(args.facing);
      const { dx, dy } = directionStep(back);
      if (enter(args.x, args.y, dx, dy)) {
        // #region agent log
        agentLog({
          hypothesisId: "D",
          location: "ghostPath.ts:pickGhostDirection",
          message: "fallback reverse only",
          data: {
            col: worldToCol(args.x),
            row: worldToRow(args.y),
            facing: args.facing,
            opens,
            isL,
            back,
          },
        });
        // #endregion
        return back;
      }
    }
    // #region agent log
    agentLog({
      hypothesisId: "D",
      location: "ghostPath.ts:pickGhostDirection",
      message: "no candidates returning facing/none",
      data: {
        col: worldToCol(args.x),
        row: worldToRow(args.y),
        facing: args.facing,
        opens,
        isL,
        result: args.facing,
      },
    });
    // #endregion
    return args.facing;
  }

  const col = worldToCol(args.x);
  const row = worldToRow(args.y);
  let best = candidates[0]!;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const dir of candidates) {
    const { dx, dy } = directionStep(dir);
    const nCol = col + dx;
    const nRow = row + dy;
    const dist =
      (nCol - args.targetCol) * (nCol - args.targetCol) +
      (nRow - args.targetRow) * (nRow - args.targetRow);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
      continue;
    }
    if (dist === bestDist && TIE_ORDER.indexOf(dir) < TIE_ORDER.indexOf(best)) {
      best = dir;
    }
  }

  if (isL || best === GHOST_DIR.none || opens.length === 0) {
    // #region agent log
    agentLog({
      hypothesisId: "C",
      location: "ghostPath.ts:pickGhostDirection",
      message: "pick at L/empty/none",
      data: {
        col,
        row,
        facing: args.facing,
        opens,
        candidates,
        best,
        isL,
        targetCol: args.targetCol,
        targetRow: args.targetRow,
      },
    });
    // #endregion
  }

  return best;
}
