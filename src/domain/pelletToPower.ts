/** Pick one candidate eid uniformly; empty → null. */
export function pickPelletToPowerTarget(
  candidates: readonly number[],
  rng: () => number,
): number | null {
  if (candidates.length === 0) {
    return null;
  }
  const index = Math.min(candidates.length - 1, Math.floor(rng() * candidates.length));
  return candidates[index]!;
}
