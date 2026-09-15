import { describe, expect, it } from "vitest";
import { createGhostReleaseClock, shouldReleaseGhost, tickGhostRelease } from "./ghostRelease";
import { GHOST_RELEASE_DELAY_MS } from "./ghostSpeed";

describe("ghostRelease", () => {
  it("does not start without direction input", () => {
    const clock = tickGhostRelease(createGhostReleaseClock(), false, 500);
    expect(clock.started).toBe(false);
    expect(shouldReleaseGhost(clock)).toBe(false);
  });

  it("releases after the delay once input has started the clock", () => {
    let clock = tickGhostRelease(createGhostReleaseClock(), true, 200);
    expect(shouldReleaseGhost(clock)).toBe(false);
    clock = tickGhostRelease(clock, true, GHOST_RELEASE_DELAY_MS);
    expect(shouldReleaseGhost(clock)).toBe(true);
  });
});
