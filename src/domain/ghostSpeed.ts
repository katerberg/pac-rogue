import { PLAYER_SPEED } from "./playfield";

export const GHOST_SPEED = PLAYER_SPEED * 0.9375;
export const GHOST_ELROY1_SPEED = PLAYER_SPEED * 1.0;
export const GHOST_ELROY2_SPEED = PLAYER_SPEED * (85 / 80);
export const GHOST_TUNNEL_SPEED = PLAYER_SPEED * 0.5;

export const ELROY1_DOTS_LEFT = 20;
export const ELROY2_DOTS_LEFT = 10;

export const ELROY_TIER = {
  none: 0,
  elroy1: 1,
  elroy2: 2,
} as const;

export type ElroyTier = (typeof ELROY_TIER)[keyof typeof ELROY_TIER];

export function elroyTier(pelletsRemaining: number): ElroyTier {
  if (pelletsRemaining <= ELROY2_DOTS_LEFT) {
    return ELROY_TIER.elroy2;
  }
  if (pelletsRemaining <= ELROY1_DOTS_LEFT) {
    return ELROY_TIER.elroy1;
  }
  return ELROY_TIER.none;
}

export function resolveGhostSpeed(pelletsRemaining: number, inTunnel: boolean): number {
  if (inTunnel) {
    return GHOST_TUNNEL_SPEED;
  }
  const tier = elroyTier(pelletsRemaining);
  if (tier === ELROY_TIER.elroy2) {
    return GHOST_ELROY2_SPEED;
  }
  if (tier === ELROY_TIER.elroy1) {
    return GHOST_ELROY1_SPEED;
  }
  return GHOST_SPEED;
}
