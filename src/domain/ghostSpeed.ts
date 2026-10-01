import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { ghostBaseSpeedRatio } from "./levelRules";
import { getActiveLayout } from "./maze";
import { PLAYER_SPEED } from "./playfield";

export const GHOST_SPEED = PLAYER_SPEED * 0.9375;
export const GHOST_ELROY1_SPEED = PLAYER_SPEED * 1.0;
export const GHOST_ELROY2_SPEED = PLAYER_SPEED * (85 / 80);
export const GHOST_TUNNEL_SPEED_RATIO = 0.6;
export const GHOST_TUNNEL_SPEED = PLAYER_SPEED * GHOST_TUNNEL_SPEED_RATIO;
export const GHOST_HOUSE_EXIT_SPEED = PLAYER_SPEED * 0.5;

export const ELROY_TIER = {
  none: 0,
  elroy1: 1,
  elroy2: 2,
} as const;

export type ElroyTier = (typeof ELROY_TIER)[keyof typeof ELROY_TIER];

export function elroyTier(pelletsRemaining: number): ElroyTier {
  const layout = getActiveLayout();
  if (pelletsRemaining <= layout.elroy2DotsLeft) {
    return ELROY_TIER.elroy2;
  }
  if (pelletsRemaining <= layout.elroy1DotsLeft) {
    return ELROY_TIER.elroy1;
  }
  return ELROY_TIER.none;
}

export function resolveGhostSpeed(
  pelletsRemaining: number,
  inTunnel: boolean,
  levelIndex: number,
  tunnelSpeed: number = GHOST_TUNNEL_SPEED,
): number {
  if (inTunnel) {
    return tunnelSpeed;
  }
  const baseSpeed = PLAYER_SPEED * ghostBaseSpeedRatio(levelIndex);
  const tier = elroyTier(pelletsRemaining);
  if (tier === ELROY_TIER.elroy2) {
    return GHOST_ELROY2_SPEED;
  }
  if (tier === ELROY_TIER.elroy1) {
    return GHOST_ELROY1_SPEED;
  }
  return baseSpeed;
}

export const BOSS_GHOST_SPEED = PLAYER_SPEED;

export function resolveBossGhostSpeed(
  inTunnel: boolean,
  tunnelSpeed: number = GHOST_TUNNEL_SPEED,
): number {
  return inTunnel ? tunnelSpeed : BOSS_GHOST_SPEED;
}

export function resolveGhostSpeedForKind(
  kind: GhostKindId,
  pelletsRemaining: number,
  inTunnel: boolean,
  levelIndex: number,
  leavingHouse = false,
  tunnelSpeed: number = GHOST_TUNNEL_SPEED,
): number {
  if (kind === GHOST_KIND.blinky) {
    return resolveGhostSpeed(pelletsRemaining, inTunnel, levelIndex, tunnelSpeed);
  }
  if (inTunnel) {
    return tunnelSpeed;
  }
  return leavingHouse
    ? GHOST_HOUSE_EXIT_SPEED
    : resolveGhostSpeed(Number.POSITIVE_INFINITY, false, levelIndex);
}
