import { describe, expect, it } from "vitest";
import { createNearMissPasses, stepNearMissPasses, type NearMissPasses } from "./nearMiss";

const TILE = 16;

function run(distances: readonly number[], catchable: readonly boolean[] = []): number {
  let passes: NearMissPasses = createNearMissPasses();
  let total = 0;
  distances.forEach((distancePx, i) => {
    const step = stepNearMissPasses(
      passes,
      [{ eid: 7, distancePx, catchable: catchable[i] ?? true }],
      TILE,
    );
    passes = step.passes;
    total += step.completed;
  });
  return total;
}

describe("stepNearMissPasses", () => {
  it("pays once when a ghost first touches within 1 tile", () => {
    expect(run([40, 16])).toBe(1);
    expect(run([40, 16, 10, 17])).toBe(1);
  });

  it("pays while the ghost is still touching, such as one tailing you round a corner", () => {
    expect(run([40, 16, 4, 12])).toBe(1);
  });

  it("does not pay a ghost that never came within 1 tile", () => {
    expect(run([40, 17, 20, 40])).toBe(0);
  });

  it("re-arms only after the ghost goes past 1.5 tiles", () => {
    expect(run([10, 20, 10, 20])).toBe(1);
    expect(run([10, 20, 25, 10, 20])).toBe(2);
  });

  it("pays and re-arms when the ghost jumps past 1.5 tiles", () => {
    expect(run([10, 30, 10, 30])).toBe(2);
  });

  it("pays nothing for a ghost that could not catch you on contact", () => {
    expect(run([10, 10, 20], [false, true, true])).toBe(0);
    expect(run([10, 20], [false, true])).toBe(0);
  });

  it("forgets ghosts that drop out of the samples", () => {
    let passes: NearMissPasses = createNearMissPasses();
    passes = stepNearMissPasses(passes, [{ eid: 1, distancePx: 8, catchable: true }], TILE).passes;
    const step = stepNearMissPasses(passes, [], TILE);
    expect(step.completed).toBe(0);
    expect(step.passes.size).toBe(0);
  });

  it("counts several ghosts in one step", () => {
    const step = stepNearMissPasses(
      createNearMissPasses(),
      [
        { eid: 1, distancePx: 8, catchable: true },
        { eid: 2, distancePx: 8, catchable: true },
        { eid: 3, distancePx: 30, catchable: true },
      ],
      TILE,
    );
    expect(step.completed).toBe(2);
  });
});
