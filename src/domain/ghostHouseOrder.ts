import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { getActiveLayout } from "./maze";
import {
  BLINKY_RELEASE_DELAY_MS,
  CLYDE_POST_LIFE_RELEASE_DELAY_MS,
  INKY_POST_LIFE_RELEASE_DELAY_MS,
  PINKY_RELEASE_DELAY_MS,
  shouldReleaseKind,
  type GhostReleaseClock,
} from "./ghostRelease";

function isPelletGated(kind: GhostKindId): boolean {
  return kind === GHOST_KIND.inky || kind === GHOST_KIND.clyde;
}

function pelletThresholdForKind(kind: GhostKindId): number {
  const layout = getActiveLayout();
  return kind === GHOST_KIND.inky ? layout.inkyReleasePellets : layout.clydeReleasePellets;
}

function effectiveDelayKey(
  kind: GhostKindId,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease: boolean,
): number {
  if (isPelletGated(kind)) {
    if (afterLifeRelease) {
      return kind === GHOST_KIND.inky
        ? INKY_POST_LIFE_RELEASE_DELAY_MS
        : CLYDE_POST_LIFE_RELEASE_DELAY_MS;
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
  if (isPelletGated(kind) && !afterLifeRelease) {
    return Number.POSITIVE_INFINITY;
  }
  const delay =
    kind === GHOST_KIND.inky
      ? INKY_POST_LIFE_RELEASE_DELAY_MS
      : kind === GHOST_KIND.clyde
        ? CLYDE_POST_LIFE_RELEASE_DELAY_MS
        : kind === GHOST_KIND.pinky
          ? PINKY_RELEASE_DELAY_MS
          : BLINKY_RELEASE_DELAY_MS;
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

  const aPelletWait = isPelletGated(a) && !afterLifeRelease;
  const bPelletWait = isPelletGated(b) && !afterLifeRelease;
  if (aPelletWait !== bPelletWait) {
    return aPelletWait ? 1 : -1;
  }
  if (aPelletWait && bPelletWait) {
    const byThreshold = pelletThresholdForKind(a) - pelletThresholdForKind(b);
    if (byThreshold !== 0) {
      return byThreshold;
    }
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
