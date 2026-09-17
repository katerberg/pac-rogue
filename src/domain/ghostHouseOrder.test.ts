import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { compareInHouseReleaseOrder, sortInHouseGhosts } from "./ghostHouseOrder";
import {
  BLINKY_RELEASE_DELAY_MS,
  CLYDE_POST_LIFE_RELEASE_DELAY_MS,
  INKY_POST_LIFE_RELEASE_DELAY_MS,
  PINKY_RELEASE_DELAY_MS,
  createGhostReleaseClock,
} from "./ghostRelease";
import { activateLayout, getActiveLayout } from "./maze";

describe("ghostHouseOrder", () => {
  it("orders Blinky Pinky Inky Clyde at level start", () => {
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
      GHOST_KIND.blinky,
      GHOST_KIND.pinky,
      GHOST_KIND.inky,
      GHOST_KIND.clyde,
    ]);
  });

  it("puts pellet-ready Inky ahead of waiting Pinky", () => {
    activateLayout("maze1");
    const clock = { started: true, elapsedMs: BLINKY_RELEASE_DELAY_MS + 1 };
    const threshold = getActiveLayout().inkyReleasePellets;
    expect(
      compareInHouseReleaseOrder(GHOST_KIND.inky, GHOST_KIND.pinky, clock, threshold, false),
    ).toBeLessThan(0);
  });

  it("puts pellet-ready Clyde ahead of waiting Pinky", () => {
    activateLayout("maze1");
    const clock = { started: true, elapsedMs: BLINKY_RELEASE_DELAY_MS + 1 };
    const threshold = getActiveLayout().clydeReleasePellets;
    expect(
      compareInHouseReleaseOrder(GHOST_KIND.clyde, GHOST_KIND.pinky, clock, threshold, false),
    ).toBeLessThan(0);
  });

  it("orders post-life by time delays Blinky Pinky Inky Clyde", () => {
    const clock = { started: true, elapsedMs: 0 };
    const sorted = sortInHouseGhosts(
      [
        { kind: GHOST_KIND.clyde },
        { kind: GHOST_KIND.inky },
        { kind: GHOST_KIND.pinky },
        { kind: GHOST_KIND.blinky },
      ],
      clock,
      0,
      true,
    );
    expect(sorted.map((g) => g.kind)).toEqual([
      GHOST_KIND.blinky,
      GHOST_KIND.pinky,
      GHOST_KIND.inky,
      GHOST_KIND.clyde,
    ]);
    expect(PINKY_RELEASE_DELAY_MS).toBeLessThan(INKY_POST_LIFE_RELEASE_DELAY_MS);
    expect(INKY_POST_LIFE_RELEASE_DELAY_MS).toBeLessThan(CLYDE_POST_LIFE_RELEASE_DELAY_MS);
  });
});
