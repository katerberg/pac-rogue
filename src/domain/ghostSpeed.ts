import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { ghostBaseSpeedRatio } from "./levelRules";
import { getActiveLayout, scaleToActiveLayout } from "./maze";
import { playerSpeed } from "./playfield";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

function ghostSpeedFromRatio(ratio: number, tuning: Tuning = DEFAULT_TUNING): number {
  return playerSpeed(tuning) * ratio;
}

export const GHOST_TUNNEL_SPEED_RATIO = DEFAULT_TUNING.ghostTunnelRatio;
export const GHOST_SPEED = ghostSpeedFromRatio(0.9375);
export const GHOST_ELROY1_SPEED = ghostSpeedFromRatio(DEFAULT_TUNING.elroy1Ratio);
export const GHOST_ELROY2_SPEED = ghostSpeedFromRatio(DEFAULT_TUNING.elroy2Ratio);
export const GHOST_TUNNEL_SPEED = ghostSpeedFromRatio(GHOST_TUNNEL_SPEED_RATIO);
export const GHOST_HOUSE_EXIT_SPEED = ghostSpeedFromRatio(DEFAULT_TUNING.ghostHouseExitRatio);
export const BOSS_GHOST_SPEED = ghostSpeedFromRatio(DEFAULT_TUNING.bossGhostRatio);

export const ELROY_TIER = {
  none: 0,
  elroy1: 1,
  elroy2: 2,
} as const;

export type ElroyTier = (typeof ELROY_TIER)[keyof typeof ELROY_TIER];

function elroyCutoffs(tuning: Tuning): { elroy1DotsLeft: number; elroy2DotsLeft: number } {
  const layout = getActiveLayout();
  if (tuning === DEFAULT_TUNING) {
    return layout;
  }
  return {
    elroy1DotsLeft: scaleToActiveLayout(tuning.elroy1DotsLeft),
    elroy2DotsLeft: scaleToActiveLayout(tuning.elroy2DotsLeft),
  };
}

export function elroyTier(pelletsRemaining: number, tuning: Tuning = DEFAULT_TUNING): ElroyTier {
  const cutoffs = elroyCutoffs(tuning);
  if (pelletsRemaining <= cutoffs.elroy2DotsLeft) {
    return ELROY_TIER.elroy2;
  }
  if (pelletsRemaining <= cutoffs.elroy1DotsLeft) {
    return ELROY_TIER.elroy1;
  }
  return ELROY_TIER.none;
}

/** Level 1 only: keep half of the Elroy speed bump over the level's base ghost ratio. */
const LEVEL_1_ELROY_BONUS_SCALE = 0.5;

function elroyRatioForLevel(elroyRatio: number, levelIndex: number, tuning: Tuning): number {
  if (levelIndex !== 1) {
    return elroyRatio;
  }
  const base = ghostBaseSpeedRatio(levelIndex, tuning);
  return base + LEVEL_1_ELROY_BONUS_SCALE * (elroyRatio - base);
}

function baseOrElroyRatio(pelletsRemaining: number, levelIndex: number, tuning: Tuning): number {
  const tier = elroyTier(pelletsRemaining, tuning);
  if (tier === ELROY_TIER.elroy2) {
    return elroyRatioForLevel(tuning.elroy2Ratio, levelIndex, tuning);
  }
  if (tier === ELROY_TIER.elroy1) {
    return elroyRatioForLevel(tuning.elroy1Ratio, levelIndex, tuning);
  }
  return ghostBaseSpeedRatio(levelIndex, tuning);
}

export function resolveGhostSpeed(
  pelletsRemaining: number,
  inTunnel: boolean,
  levelIndex: number,
  tunnelRatio: number = GHOST_TUNNEL_SPEED_RATIO,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  const ratio = inTunnel ? tunnelRatio : baseOrElroyRatio(pelletsRemaining, levelIndex, tuning);
  return ghostSpeedFromRatio(ratio, tuning);
}

export function resolveBossGhostSpeed(
  inTunnel: boolean,
  tunnelRatio: number = GHOST_TUNNEL_SPEED_RATIO,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  return ghostSpeedFromRatio(inTunnel ? tunnelRatio : tuning.bossGhostRatio, tuning);
}

export function resolveGhostSpeedForKind(
  kind: GhostKindId,
  pelletsRemaining: number,
  inTunnel: boolean,
  levelIndex: number,
  leavingHouse = false,
  tunnelRatio: number = GHOST_TUNNEL_SPEED_RATIO,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  if (kind === GHOST_KIND.blinky) {
    return resolveGhostSpeed(pelletsRemaining, inTunnel, levelIndex, tunnelRatio, tuning);
  }
  if (inTunnel) {
    return ghostSpeedFromRatio(tunnelRatio, tuning);
  }
  return ghostSpeedFromRatio(
    leavingHouse ? tuning.ghostHouseExitRatio : ghostBaseSpeedRatio(levelIndex, tuning),
    tuning,
  );
}
