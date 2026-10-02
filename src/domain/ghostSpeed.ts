import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { ghostBaseSpeedRatio } from "./levelRules";
import { getActiveLayout, scaleToActiveLayout } from "./maze";
import { PLAYER_SPEED, playerSpeed } from "./playfield";
import { DEFAULT_TUNING, type Tuning } from "./tuning";

export const GHOST_SPEED = PLAYER_SPEED * 0.9375;
export const GHOST_ELROY1_SPEED = PLAYER_SPEED * DEFAULT_TUNING.elroy1Ratio;
export const GHOST_ELROY2_SPEED = PLAYER_SPEED * DEFAULT_TUNING.elroy2Ratio;
export const GHOST_TUNNEL_SPEED_RATIO = DEFAULT_TUNING.ghostTunnelRatio;
export const GHOST_TUNNEL_SPEED = PLAYER_SPEED * GHOST_TUNNEL_SPEED_RATIO;
export const GHOST_HOUSE_EXIT_SPEED = PLAYER_SPEED * DEFAULT_TUNING.ghostHouseExitRatio;

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

export function ghostTunnelSpeed(tuning: Tuning = DEFAULT_TUNING): number {
  return playerSpeed(tuning) * tuning.ghostTunnelRatio;
}

export function resolveGhostSpeed(
  pelletsRemaining: number,
  inTunnel: boolean,
  levelIndex: number,
  tunnelSpeed: number = GHOST_TUNNEL_SPEED,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  if (inTunnel) {
    return tunnelSpeed;
  }
  const player = playerSpeed(tuning);
  const tier = elroyTier(pelletsRemaining, tuning);
  if (tier === ELROY_TIER.elroy2) {
    return player * tuning.elroy2Ratio;
  }
  if (tier === ELROY_TIER.elroy1) {
    return player * tuning.elroy1Ratio;
  }
  return player * ghostBaseSpeedRatio(levelIndex, tuning);
}

export const BOSS_GHOST_SPEED = PLAYER_SPEED * DEFAULT_TUNING.bossGhostRatio;

export function resolveBossGhostSpeed(
  inTunnel: boolean,
  tunnelSpeed: number = GHOST_TUNNEL_SPEED,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  return inTunnel ? tunnelSpeed : playerSpeed(tuning) * tuning.bossGhostRatio;
}

export function resolveGhostSpeedForKind(
  kind: GhostKindId,
  pelletsRemaining: number,
  inTunnel: boolean,
  levelIndex: number,
  leavingHouse = false,
  tunnelSpeed: number = GHOST_TUNNEL_SPEED,
  tuning: Tuning = DEFAULT_TUNING,
): number {
  if (kind === GHOST_KIND.blinky) {
    return resolveGhostSpeed(pelletsRemaining, inTunnel, levelIndex, tunnelSpeed, tuning);
  }
  if (inTunnel) {
    return tunnelSpeed;
  }
  return leavingHouse
    ? playerSpeed(tuning) * tuning.ghostHouseExitRatio
    : resolveGhostSpeed(Number.POSITIVE_INFINITY, false, levelIndex, tunnelSpeed, tuning);
}
