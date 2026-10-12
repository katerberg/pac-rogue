import type { ReleaseSlot } from "./ghostRoster";
import {
  isTimeGatedRelease,
  releaseDelayMs,
  releaseDots,
  shouldReleaseSlot,
  type GhostReleaseAdds,
  type GhostReleaseClock,
} from "./ghostRelease";

function remainingTimeMs(
  slot: ReleaseSlot,
  clock: GhostReleaseClock,
  adds: GhostReleaseAdds,
): number {
  const delay = releaseDelayMs(slot, adds.delayAddMs ?? 0, adds.tuning);
  return clock.started ? Math.max(0, delay - clock.elapsedMs) : delay;
}

export function compareInHouseReleaseOrder(
  a: ReleaseSlot,
  b: ReleaseSlot,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
  adds: GhostReleaseAdds = {},
): number {
  const aReady = shouldReleaseSlot(a, clock, collectedCount, afterLifeRelease, adds);
  const bReady = shouldReleaseSlot(b, clock, collectedCount, afterLifeRelease, adds);
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
    : releaseDots(a, clock.level, afterLifeRelease, adds.reliefPelletAdd, adds.tuning) -
      releaseDots(b, clock.level, afterLifeRelease, adds.reliefPelletAdd, adds.tuning);
  if (byGate !== 0) {
    return byGate;
  }
  return a - b;
}

export function sortInHouseGhosts<T extends { slot: ReleaseSlot; eid?: number }>(
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
        left.slot,
        right.slot,
        clock,
        collectedCount,
        afterLifeRelease,
        adds,
      ),
  );
}
