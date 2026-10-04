export type PelletCollectCandidate = {
  eid: number;
  x: number;
  y: number;
};

export function pickFurthestPelletEids(
  candidates: readonly PelletCollectCandidate[],
  playerX: number,
  playerY: number,
  count: number,
): number[] {
  if (count <= 0) {
    return [];
  }
  return candidates
    .map((candidate) => ({
      eid: candidate.eid,
      distSq: (candidate.x - playerX) ** 2 + (candidate.y - playerY) ** 2,
    }))
    .sort((a, b) => b.distSq - a.distSq || a.eid - b.eid)
    .slice(0, count)
    .map((entry) => entry.eid);
}

export function remoteTransferTriggers(
  prevCount: number,
  nextCount: number,
  every: number,
): number {
  if (every <= 0) {
    return 0;
  }
  return Math.floor(nextCount / every) - Math.floor(prevCount / every);
}
