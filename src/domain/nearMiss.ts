export type NearMissSample = { eid: number; touching: boolean; catchable: boolean };

export type NearMissPasses = ReadonlySet<number>;

export function createNearMissPasses(): NearMissPasses {
  return new Set();
}

export function stepNearMissPasses(
  passes: NearMissPasses,
  samples: readonly NearMissSample[],
): { passes: NearMissPasses; completed: number } {
  const next = new Set<number>();
  let completed = 0;
  for (const { eid, touching, catchable } of samples) {
    if (!touching) {
      continue;
    }
    next.add(eid);
    if (catchable && !passes.has(eid)) {
      completed += 1;
    }
  }
  return { passes: next, completed };
}
