import type { UpgradeSchool } from "./upgrades";

export const GHOST_KIND = {
  blinky: 0,
  pinky: 1,
  clyde: 2,
  inky: 3,
  spunky: 4,
  wardy: 5,
} as const;

export type GhostKindId = (typeof GHOST_KIND)[keyof typeof GHOST_KIND];

export const GHOST_SCHOOL: Record<GhostKindId, Exclude<UpgradeSchool, "neutral">> = {
  [GHOST_KIND.blinky]: "disruption",
  [GHOST_KIND.pinky]: "automation",
  [GHOST_KIND.inky]: "speed",
  [GHOST_KIND.clyde]: "harvest",
  [GHOST_KIND.spunky]: "protection",
  [GHOST_KIND.wardy]: "death",
};

export function ghostKindLabel(kind: GhostKindId): string {
  const name = Object.entries(GHOST_KIND).find(([, id]) => id === kind)![0];
  return name.toUpperCase();
}
