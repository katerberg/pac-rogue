import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import {
  BLINKY_RELEASE_DELAY_MS,
  CLYDE_POST_LIFE_RELEASE_DELAY_MS,
  PINKY_RELEASE_DELAY_MS,
  shouldReleaseKind,
  type GhostReleaseClock,
} from "./ghostRelease";

function effectiveDelayKey(
  kind: GhostKindId,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease: boolean,
): number {
  if (kind === GHOST_KIND.clyde) {
    if (afterLifeRelease) {
      return CLYDE_POST_LIFE_RELEASE_DELAY_MS;
    }
    if (shouldReleaseKind(kind, clock, collectedCount, afterLifeRelease)) {
      return 0;
    }
    return Number.POSITIVE_INFINITY;
  }
  return kind === GHOST_KIND.pinky ? PINKY_RELEASE_DELAY_MS : BLINKY_RELEASE_DELAY_MS;
}

function remainingTimeMs(
  kind: GhostKindId,
  clock: GhostReleaseClock,
  afterLifeRelease: boolean,
): number {
  const delay =
    kind === GHOST_KIND.clyde
      ? CLYDE_POST_LIFE_RELEASE_DELAY_MS
      : kind === GHOST_KIND.pinky
        ? PINKY_RELEASE_DELAY_MS
        : BLINKY_RELEASE_DELAY_MS;
  if (kind === GHOST_KIND.clyde && !afterLifeRelease) {
    return Number.POSITIVE_INFINITY;
  }
  if (!clock.started) {
    return delay;
  }
  return Math.max(0, delay - clock.elapsedMs);
}

export function compareInHouseReleaseOrder(
  a: GhostKindId,
  b: GhostKindId,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
): number {
  const aReady = shouldReleaseKind(a, clock, collectedCount, afterLifeRelease);
  const bReady = shouldReleaseKind(b, clock, collectedCount, afterLifeRelease);
  if (aReady !== bReady) {
    return aReady ? -1 : 1;
  }

  if (aReady && bReady) {
    return (
      effectiveDelayKey(a, clock, collectedCount, afterLifeRelease) -
      effectiveDelayKey(b, clock, collectedCount, afterLifeRelease)
    );
  }

  const aPelletWait = a === GHOST_KIND.clyde && !afterLifeRelease;
  const bPelletWait = b === GHOST_KIND.clyde && !afterLifeRelease;
  if (aPelletWait !== bPelletWait) {
    return aPelletWait ? 1 : -1;
  }

  const rem =
    remainingTimeMs(a, clock, afterLifeRelease) - remainingTimeMs(b, clock, afterLifeRelease);
  if (rem !== 0) {
    return rem;
  }
  return a - b;
}

export function sortInHouseGhosts<T extends { kind: GhostKindId }>(
  ghosts: readonly T[],
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
): T[] {
  return [...ghosts].sort((left, right) =>
    compareInHouseReleaseOrder(left.kind, right.kind, clock, collectedCount, afterLifeRelease),
  );
}
