import { describe, expect, it } from "vitest";
import { GHOST_PHASE } from "./ghostPhase";
import { pickClosestGhostEid } from "./ghostRecall";

describe("pickClosestGhostEid", () => {
  it("returns null when no eligible candidates", () => {
    expect(pickClosestGhostEid([], 0, 0)).toBeNull();
    expect(
      pickClosestGhostEid([{ eid: 1, x: 10, y: 10, phase: GHOST_PHASE.inHouse }], 0, 0),
    ).toBeNull();
  });

  it("picks the closest leaving or active ghost and skips inHouse", () => {
    const eid = pickClosestGhostEid(
      [
        { eid: 1, x: 100, y: 0, phase: GHOST_PHASE.active },
        { eid: 2, x: 10, y: 0, phase: GHOST_PHASE.inHouse },
        { eid: 3, x: 20, y: 0, phase: GHOST_PHASE.leaving },
      ],
      0,
      0,
    );
    expect(eid).toBe(3);
  });

  it("breaks distance ties with lowest eid", () => {
    const eid = pickClosestGhostEid(
      [
        { eid: 9, x: 5, y: 0, phase: GHOST_PHASE.active },
        { eid: 4, x: 5, y: 0, phase: GHOST_PHASE.active },
      ],
      0,
      0,
    );
    expect(eid).toBe(4);
  });
});
