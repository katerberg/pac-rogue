import { describe, expect, it } from "vitest";
import { createNearMissPasses, stepNearMissPasses, type NearMissPasses } from "./nearMiss";

function run(touching: readonly boolean[], catchable: readonly boolean[] = []): number {
  let passes: NearMissPasses = createNearMissPasses();
  let total = 0;
  touching.forEach((isTouching, i) => {
    const step = stepNearMissPasses(passes, [
      { eid: 7, touching: isTouching, catchable: catchable[i] ?? true },
    ]);
    passes = step.passes;
    total += step.completed;
  });
  return total;
}

describe("stepNearMissPasses", () => {
  it("pays once when a ghost first touches", () => {
    expect(run([false, true])).toBe(1);
  });

  it("does not pay again while the circles stay touching", () => {
    expect(run([false, true, true, true])).toBe(1);
  });

  it("pays nothing for a ghost that never touches", () => {
    expect(run([false, false, false])).toBe(0);
  });

  it("pays every new touch, re-arming the moment the circles separate", () => {
    expect(run([true, false, true])).toBe(2);
    expect(run([true, false, true, false, true])).toBe(3);
  });

  it("pays nothing for a touch that could not catch you", () => {
    expect(run([true, true, false], [false, true, true])).toBe(0);
    expect(run([true, true], [true, false])).toBe(1);
  });

  it("forgets ghosts that drop out of the samples", () => {
    let passes: NearMissPasses = createNearMissPasses();
    passes = stepNearMissPasses(passes, [{ eid: 1, touching: true, catchable: true }]).passes;
    const step = stepNearMissPasses(passes, []);
    expect(step.completed).toBe(0);
    expect(step.passes.size).toBe(0);
  });

  it("counts several ghosts in one step", () => {
    const step = stepNearMissPasses(createNearMissPasses(), [
      { eid: 1, touching: true, catchable: true },
      { eid: 2, touching: true, catchable: true },
      { eid: 3, touching: false, catchable: true },
    ]);
    expect(step.completed).toBe(2);
  });
});
