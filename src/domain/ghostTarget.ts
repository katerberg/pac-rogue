import { GHOST_HOUSE_EXIT_COL, GHOST_HOUSE_EXIT_ROW } from "./maze";
import { ELROY_TIER, elroyTier, type ElroyTier } from "./ghostSpeed";
import { GHOST_AI_MODE, type GhostAiMode } from "./ghostMode";
import { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";

export { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";

export const BLINKY_SCATTER_COL = 25;
export const BLINKY_SCATTER_ROW = -3;

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
