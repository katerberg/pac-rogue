import { GHOST_HOUSE_EXIT_COL, GHOST_HOUSE_EXIT_ROW } from "./maze";
import { ELROY_TIER, elroyTier, type ElroyTier } from "./ghostSpeed";
import { GHOST_AI_MODE, type GhostAiMode } from "./ghostMode";
import { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";
import { GHOST_DIR, type GhostDir } from "./ghostPath";

export { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";

/** Tune freely — unreachable tile off the NE corner. */
export const BLINKY_SCATTER_COL = 25;
export const BLINKY_SCATTER_ROW = -3;

/** Tune freely — unreachable tile off the NW corner. */
export const PINKY_SCATTER_COL = 2;
export const PINKY_SCATTER_ROW = -3;

export const PINKY_LOOKAHEAD_TILES = 4;

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
}): GhostTarget {
  if (args.phase === GHOST_PHASE.leaving) {
    return { col: GHOST_HOUSE_EXIT_COL, row: GHOST_HOUSE_EXIT_ROW };
  }

  const tier: ElroyTier = elroyTier(args.pelletsRemaining);
  if (args.mode === GHOST_AI_MODE.chase || tier !== ELROY_TIER.none) {
    return { col: args.playerCol, row: args.playerRow };
  }

  return { col: BLINKY_SCATTER_COL, row: BLINKY_SCATTER_ROW };
}

function pinkyChaseFacing(playerFacing: GhostDir): GhostDir {
  return playerFacing === GHOST_DIR.none ? GHOST_DIR.left : playerFacing;
}

export function pinkyTarget(args: {
  phase: GhostPhaseValue;
  mode: GhostAiMode;
  playerCol: number;
  playerRow: number;
  playerFacing: GhostDir;
}): GhostTarget {
  if (args.phase === GHOST_PHASE.leaving) {
    return { col: GHOST_HOUSE_EXIT_COL, row: GHOST_HOUSE_EXIT_ROW };
  }

  if (args.mode === GHOST_AI_MODE.scatter) {
    return { col: PINKY_SCATTER_COL, row: PINKY_SCATTER_ROW };
  }

  const facing = pinkyChaseFacing(args.playerFacing);
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
