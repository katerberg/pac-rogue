import { GHOST_PHASE, type GhostPhaseValue } from "./ghostPhase";

export type GhostRecallCandidate = {
  eid: number;
  x: number;
  y: number;
  phase: GhostPhaseValue;
};

export function pickClosestGhostEid(
  candidates: readonly GhostRecallCandidate[],
  fromX: number,
  fromY: number,
): number | null {
  let bestEid: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (candidate.phase === GHOST_PHASE.inHouse) {
      continue;
    }
    const dx = candidate.x - fromX;
    const dy = candidate.y - fromY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist || (dist === bestDist && (bestEid === null || candidate.eid < bestEid))) {
      bestDist = dist;
      bestEid = candidate.eid;
    }
  }

  return bestEid;
}
