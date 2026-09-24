import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { ghostBaseSpeedRatio } from "./levelRules";
import { getActiveLayout } from "./maze";
import { PLAYER_SPEED } from "./playfield";

export const GHOST_SPEED = PLAYER_SPEED * 0.9375;
export const GHOST_ELROY1_SPEED = PLAYER_SPEED * 1.0;
export const GHOST_ELROY2_SPEED = PLAYER_SPEED * (85 / 80);

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
): number {
  const baseSpeed = PLAYER_SPEED * ghostBaseSpeedRatio(levelIndex);
  if (inTunnel) {
    return baseSpeed * 0.5;
  }
  const tier = elroyTier(pelletsRemaining);
  if (tier === ELROY_TIER.elroy2) {
    return GHOST_ELROY2_SPEED;
  }
  if (tier === ELROY_TIER.elroy1) {
    return GHOST_ELROY1_SPEED;
  }
  return baseSpeed;
}

export function resolveGhostSpeedForKind(
  kind: GhostKindId,
  pelletsRemaining: number,
  inTunnel: boolean,
  levelIndex: number,
): number {
  if (kind === GHOST_KIND.blinky) {
    return resolveGhostSpeed(pelletsRemaining, inTunnel, levelIndex);
  }
  return resolveGhostSpeed(Number.POSITIVE_INFINITY, inTunnel, levelIndex);
}
