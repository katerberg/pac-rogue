export const GHOST_KIND = {
  blinky: 0,
  pinky: 1,
  clyde: 2,
  inky: 3,
} as const;

export type GhostKindId = (typeof GHOST_KIND)[keyof typeof GHOST_KIND];
