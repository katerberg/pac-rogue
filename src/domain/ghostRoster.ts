import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { createRunRandom, freshSeed, type RunRandom } from "./runRandom";

export const RELEASE_SLOT = { anchor: 0, front: 1, flank: 2, relief: 3 } as const;

export type ReleaseSlot = (typeof RELEASE_SLOT)[keyof typeof RELEASE_SLOT];

const { blinky, pinky, inky, clyde, spunky, wardy } = GHOST_KIND;

export const GHOST_ROSTERS: readonly (readonly GhostKindId[])[] = [
  [blinky, pinky, inky, clyde],
  [blinky, pinky, inky, spunky],
  [blinky, wardy, inky, clyde],
  [blinky, wardy, inky, spunky],
  [blinky, pinky, wardy, clyde],
  [blinky, pinky, wardy, spunky],
];

export const RELEASE_SLOT_BY_KIND: Record<GhostKindId, ReleaseSlot> = {
  [blinky]: RELEASE_SLOT.anchor,
  [pinky]: RELEASE_SLOT.front,
  [wardy]: RELEASE_SLOT.front,
  [inky]: RELEASE_SLOT.flank,
  [clyde]: RELEASE_SLOT.relief,
  [spunky]: RELEASE_SLOT.relief,
};

const FRESH_SEED_ATTEMPTS = 8;

export function pickRosterId(random: RunRandom): number {
  return Math.floor(random.stream("roster")() * GHOST_ROSTERS.length);
}

export function rosterIdForSeed(seed: string): number {
  return pickRosterId(createRunRandom(seed));
}

export function mintFreshSeed(
  previousRosterId: number | null,
  mint: () => string = freshSeed,
): string {
  let seed = mint();
  for (
    let attempt = 1;
    attempt < FRESH_SEED_ATTEMPTS && rosterIdForSeed(seed) === previousRosterId;
    attempt += 1
  ) {
    seed = mint();
  }
  return seed;
}

export function parseRosterId(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  const id = Number(raw);
  return id < GHOST_ROSTERS.length ? id : null;
}
