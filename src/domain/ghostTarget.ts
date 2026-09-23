import { ELROY_TIER, elroyTier, type ElroyTier } from "./ghostSpeed";
import { GHOST_AI_MODE, type GhostAiMode } from "./ghostMode";
import { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";
import { GHOST_DIR, type GhostDir } from "./ghostPath";
import { leavingHouseTarget } from "./ghostHouseLeave";
import { getActiveLayout } from "./maze";

export { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";

export const PINKY_LOOKAHEAD_TILES = 4;

export const CLYDE_SHY_TILES = 8;

export const INKY_LOOKAHEAD_TILES = 2;

export type GhostTarget = {
  col: number;
  row: number;
};

export function blinkyScatterTarget(cols: number = getActiveLayout().cols): GhostTarget {
  return { col: cols - 3, row: -3 };
}

export function pinkyScatterTarget(): GhostTarget {
  return { col: 2, row: -3 };
}

export function inkyScatterTarget(
  cols: number = getActiveLayout().cols,
  rows: number = getActiveLayout().rows,
): GhostTarget {
  return { col: cols - 1, row: rows + 2 };
}

export function clydeScatterTarget(rows: number = getActiveLayout().rows): GhostTarget {
  return { col: 0, row: rows + 2 };
}

export function lookAheadTile(
  playerCol: number,
  playerRow: number,
  playerFacing: GhostDir,
  tiles: number,
): GhostTarget {
  const facing = playerFacing === GHOST_DIR.none ? GHOST_DIR.left : playerFacing;
  switch (facing) {
    case GHOST_DIR.up:
      return { col: playerCol, row: playerRow - tiles };
    case GHOST_DIR.down:
      return { col: playerCol, row: playerRow + tiles };
    case GHOST_DIR.right:
      return { col: playerCol + tiles, row: playerRow };
    case GHOST_DIR.left:
    default:
      return { col: playerCol - tiles, row: playerRow };
  }
}

export function blinkyTarget(args: {
  phase: GhostPhaseValue;
  mode: GhostAiMode;
  pelletsRemaining: number;
  playerCol: number;
  playerRow: number;
  ghostCol?: number;
  ghostRow?: number;
  ignoreElroy?: boolean;
}): GhostTarget {
  if (args.phase === GHOST_PHASE.leaving) {
    return leavingHouseTarget(args.ghostCol ?? args.playerCol, args.ghostRow ?? args.playerRow);
  }

  const tier: ElroyTier = elroyTier(args.pelletsRemaining);
  const elroyChases = tier !== ELROY_TIER.none && !args.ignoreElroy;
  if (args.mode === GHOST_AI_MODE.chase || elroyChases) {
    return { col: args.playerCol, row: args.playerRow };
  }

  return blinkyScatterTarget();
}

export function pinkyTarget(args: {
  phase: GhostPhaseValue;
  mode: GhostAiMode;
  playerCol: number;
  playerRow: number;
  playerFacing: GhostDir;
  ghostCol?: number;
  ghostRow?: number;
}): GhostTarget {
  if (args.phase === GHOST_PHASE.leaving) {
    return leavingHouseTarget(args.ghostCol ?? args.playerCol, args.ghostRow ?? args.playerRow);
  }

  if (args.mode === GHOST_AI_MODE.scatter) {
    return pinkyScatterTarget();
  }

  return lookAheadTile(args.playerCol, args.playerRow, args.playerFacing, PINKY_LOOKAHEAD_TILES);
}

export function clydeTarget(args: {
  phase: GhostPhaseValue;
  mode: GhostAiMode;
  playerCol: number;
  playerRow: number;
  ghostCol: number;
  ghostRow: number;
}): GhostTarget {
  if (args.phase === GHOST_PHASE.leaving) {
    return leavingHouseTarget(args.ghostCol, args.ghostRow);
  }

  if (args.mode === GHOST_AI_MODE.scatter) {
    return clydeScatterTarget();
  }

  const dx = args.ghostCol - args.playerCol;
  const dy = args.ghostRow - args.playerRow;
  const distance = Math.hypot(dx, dy);
  if (distance < CLYDE_SHY_TILES) {
    return clydeScatterTarget();
  }
  return { col: args.playerCol, row: args.playerRow };
}

export function inkyTarget(args: {
  phase: GhostPhaseValue;
  mode: GhostAiMode;
  playerCol: number;
  playerRow: number;
  playerFacing: GhostDir;
  blinkyCol: number;
  blinkyRow: number;
  ghostCol?: number;
  ghostRow?: number;
}): GhostTarget {
  if (args.phase === GHOST_PHASE.leaving) {
    return leavingHouseTarget(args.ghostCol ?? args.playerCol, args.ghostRow ?? args.playerRow);
  }

  if (args.mode === GHOST_AI_MODE.scatter) {
    return inkyScatterTarget();
  }

  const pivot = lookAheadTile(
    args.playerCol,
    args.playerRow,
    args.playerFacing,
    INKY_LOOKAHEAD_TILES,
  );
  return {
    col: 2 * pivot.col - args.blinkyCol,
    row: 2 * pivot.row - args.blinkyRow,
  };
}
