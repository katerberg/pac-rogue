import { ELROY_TIER, elroyTier, type ElroyTier } from "./ghostSpeed";
import { GHOST_AI_MODE, type GhostAiMode } from "./ghostMode";
import { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";
import { GHOST_DIR, type GhostDir } from "./ghostPath";
import { leavingHouseTarget } from "./ghostHouseLeave";

export { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";

export const BLINKY_SCATTER_COL = 25;
export const BLINKY_SCATTER_ROW = -3;

export const PINKY_SCATTER_COL = 2;
export const PINKY_SCATTER_ROW = -3;

export const PINKY_LOOKAHEAD_TILES = 4;

export const CLYDE_SCATTER_COL = 0;
export const CLYDE_SCATTER_ROW = 33;

export const CLYDE_SHY_TILES = 8;

export type GhostTarget = {
  col: number;
  row: number;
};

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

  return { col: BLINKY_SCATTER_COL, row: BLINKY_SCATTER_ROW };
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
    return { col: PINKY_SCATTER_COL, row: PINKY_SCATTER_ROW };
  }

  const facing = args.playerFacing === GHOST_DIR.none ? GHOST_DIR.left : args.playerFacing;
  const n = PINKY_LOOKAHEAD_TILES;
  switch (facing) {
    case GHOST_DIR.up:
      return { col: args.playerCol, row: args.playerRow - n };
    case GHOST_DIR.down:
      return { col: args.playerCol, row: args.playerRow + n };
    case GHOST_DIR.right:
      return { col: args.playerCol + n, row: args.playerRow };
    case GHOST_DIR.left:
    default:
      return { col: args.playerCol - n, row: args.playerRow };
  }
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
    return { col: CLYDE_SCATTER_COL, row: CLYDE_SCATTER_ROW };
  }

  const dx = args.ghostCol - args.playerCol;
  const dy = args.ghostRow - args.playerRow;
  const distance = Math.hypot(dx, dy);
  if (distance < CLYDE_SHY_TILES) {
    return { col: CLYDE_SCATTER_COL, row: CLYDE_SCATTER_ROW };
  }
  return { col: args.playerCol, row: args.playerRow };
}
