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

function remainingTimeMs(
  kind: GhostKindId,
  clock: GhostReleaseClock,
  adds: GhostReleaseAdds,
): number {
  const delay = releaseDelayMs(kind, adds.delayAddMs ?? 0, adds.tuning);
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
    ? remainingTimeMs(a, clock, adds) - remainingTimeMs(b, clock, adds)
    : releaseDots(a, clock.level, afterLifeRelease, adds.clydePelletAdd, adds.tuning) -
      releaseDots(b, clock.level, afterLifeRelease, adds.clydePelletAdd, adds.tuning);
  if (byGate !== 0) {
    return byGate;
  }
  return GHOST_RELEASE_PRIORITY.indexOf(a) - GHOST_RELEASE_PRIORITY.indexOf(b);
}

export function sortInHouseGhosts<T extends { kind: GhostKindId; eid?: number }>(
  ghosts: readonly T[],
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): T[] {
  const held = (ghost: T): number =>
    ghost.eid !== undefined && adds.heldGhostEids?.includes(ghost.eid) === true ? 1 : 0;
  return [...ghosts].sort(
    (left, right) =>
      held(left) - held(right) ||
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
