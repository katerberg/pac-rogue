import { type GhostKindId } from "./ghostKind";
import {
  GHOST_RELEASE_PRIORITY,
  isTimeGatedRelease,
  releaseDelayMs,
  releaseDots,
  shouldReleaseKind,
  type GhostReleaseAdds,
  type GhostReleaseClock,
} from "./ghostRelease";

function remainingTimeMs(kind: GhostKindId, clock: GhostReleaseClock, delayAddMs: number): number {
  const delay = releaseDelayMs(kind, delayAddMs);
  return clock.started ? Math.max(0, delay - clock.elapsedMs) : delay;
}

export function compareInHouseReleaseOrder(
  a: GhostKindId,
  b: GhostKindId,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): number {
  const aReady = shouldReleaseKind(a, clock, collectedCount, afterLifeRelease, adds);
  const bReady = shouldReleaseKind(b, clock, collectedCount, afterLifeRelease, adds);
  if (aReady !== bReady) {
    return aReady ? -1 : 1;
  }

  const aTimed = isTimeGatedRelease(a, afterLifeRelease);
  const bTimed = isTimeGatedRelease(b, afterLifeRelease);
  if (aTimed !== bTimed) {
    return aTimed ? -1 : 1;
  }
  const byGate = aTimed
    ? remainingTimeMs(a, clock, adds.delayAddMs ?? 0) -
      remainingTimeMs(b, clock, adds.delayAddMs ?? 0)
    : releaseDots(a, clock.level, afterLifeRelease, adds.clydePelletAdd) -
      releaseDots(b, clock.level, afterLifeRelease, adds.clydePelletAdd);
  if (byGate !== 0) {
    return byGate;
  }
  return GHOST_RELEASE_PRIORITY.indexOf(a) - GHOST_RELEASE_PRIORITY.indexOf(b);
}

export function sortInHouseGhosts<T extends { kind: GhostKindId }>(
  ghosts: readonly T[],
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): T[] {
  return [...ghosts].sort((left, right) =>
    compareInHouseReleaseOrder(
      left.kind,
      right.kind,
      clock,
      collectedCount,
      afterLifeRelease,
      adds,
    ),
  );
}
