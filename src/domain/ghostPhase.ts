export const GHOST_PHASE = {
  inHouse: 0,
  leaving: 1,
  active: 2,
} as const;

export type GhostPhaseValue = (typeof GHOST_PHASE)[keyof typeof GHOST_PHASE];
