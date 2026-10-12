import { describe, expect, it } from "vitest";
import { RELEASE_SLOT } from "./ghostRoster";
import { compareInHouseReleaseOrder, sortInHouseGhosts } from "./ghostHouseOrder";
import { createGhostReleaseClock, tickGhostRelease } from "./ghostRelease";
import { activateLayout, getActiveLayout } from "./maze";

describe("ghostHouseOrder", () => {
  it("orders front, anchor, flank, relief at level 1 start", () => {
    activateLayout("maze1");
    const clock = createGhostReleaseClock();
    const sorted = sortInHouseGhosts(
      [
        { eid: 4, slot: RELEASE_SLOT.relief },
        { eid: 3, slot: RELEASE_SLOT.flank },
        { eid: 1, slot: RELEASE_SLOT.anchor },
        { eid: 2, slot: RELEASE_SLOT.front },
      ],
      clock,
      0,
      false,
    );
    expect(sorted.map((g) => g.slot)).toEqual([
      RELEASE_SLOT.front,
      RELEASE_SLOT.anchor,
      RELEASE_SLOT.flank,
      RELEASE_SLOT.relief,
    ]);
  });

  it("puts a dot-ready flank slot ahead of the waiting anchor on level 1", () => {
    activateLayout("maze1");
    const threshold = getActiveLayout().flankReleasePellets;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, 1, threshold);
    expect(
      compareInHouseReleaseOrder(RELEASE_SLOT.flank, RELEASE_SLOT.anchor, clock, threshold, false),
    ).toBeLessThan(0);
  });

  it("puts a dot-ready relief slot ahead of the waiting anchor on level 1", () => {
    activateLayout("maze1");
    const threshold = getActiveLayout().reliefReleasePellets;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, 1, threshold);
    expect(
      compareInHouseReleaseOrder(RELEASE_SLOT.relief, RELEASE_SLOT.anchor, clock, threshold, false),
    ).toBeLessThan(0);
  });

  it("orders post-life by dot thresholds front, flank, relief", () => {
    const clock = createGhostReleaseClock(3);
    const sorted = sortInHouseGhosts(
      [{ slot: RELEASE_SLOT.relief }, { slot: RELEASE_SLOT.flank }, { slot: RELEASE_SLOT.front }],
      clock,
      0,
      true,
    );
    expect(sorted.map((g) => g.slot)).toEqual([
      RELEASE_SLOT.front,
      RELEASE_SLOT.flank,
      RELEASE_SLOT.relief,
    ]);
  });

  it("seats the held ghost last even when its gate has passed", () => {
    const clock = tickGhostRelease(createGhostReleaseClock(3), true, 10_000);
    const sorted = sortInHouseGhosts(
      [
        { eid: 1, slot: RELEASE_SLOT.anchor },
        { eid: 2, slot: RELEASE_SLOT.front },
        { eid: 3, slot: RELEASE_SLOT.flank },
      ],
      clock,
      0,
      true,
      { heldGhostEids: [1] },
    );
    expect(sorted.map((g) => g.eid)).toEqual([2, 3, 1]);
  });
});
