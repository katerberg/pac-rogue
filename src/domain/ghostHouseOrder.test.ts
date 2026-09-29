import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { compareInHouseReleaseOrder, sortInHouseGhosts } from "./ghostHouseOrder";
import { createGhostReleaseClock, tickGhostRelease } from "./ghostRelease";
import { activateLayout, getActiveLayout } from "./maze";

describe("ghostHouseOrder", () => {
  it("orders Pinky Blinky Inky Clyde at level 1 start", () => {
    activateLayout("maze1");
    const clock = createGhostReleaseClock();
    const sorted = sortInHouseGhosts(
      [
        { eid: 4, kind: GHOST_KIND.clyde },
        { eid: 3, kind: GHOST_KIND.inky },
        { eid: 1, kind: GHOST_KIND.blinky },
        { eid: 2, kind: GHOST_KIND.pinky },
      ],
      clock,
      0,
      false,
    );
    expect(sorted.map((g) => g.kind)).toEqual([
      GHOST_KIND.pinky,
      GHOST_KIND.blinky,
      GHOST_KIND.inky,
      GHOST_KIND.clyde,
    ]);
  });

  it("puts dot-ready Inky ahead of waiting Blinky on level 1", () => {
    activateLayout("maze1");
    const threshold = getActiveLayout().inkyReleasePellets;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, 1, threshold);
    expect(
      compareInHouseReleaseOrder(GHOST_KIND.inky, GHOST_KIND.blinky, clock, threshold, false),
    ).toBeLessThan(0);
  });

  it("puts dot-ready Clyde ahead of waiting Inky on level 1", () => {
    activateLayout("maze1");
    const threshold = getActiveLayout().clydeReleasePellets;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, 1, threshold);
    expect(
      compareInHouseReleaseOrder(GHOST_KIND.clyde, GHOST_KIND.blinky, clock, threshold, false),
    ).toBeLessThan(0);
  });

  it("orders post-life by dot thresholds Pinky Inky Clyde", () => {
    const clock = createGhostReleaseClock(3);
    const sorted = sortInHouseGhosts(
      [{ kind: GHOST_KIND.clyde }, { kind: GHOST_KIND.inky }, { kind: GHOST_KIND.pinky }],
      clock,
      0,
      true,
    );
    expect(sorted.map((g) => g.kind)).toEqual([
      GHOST_KIND.pinky,
      GHOST_KIND.inky,
      GHOST_KIND.clyde,
    ]);
  });
});
