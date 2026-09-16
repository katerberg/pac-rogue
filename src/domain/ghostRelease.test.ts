import { describe, expect, it } from "vitest";
import {
  GHOST_RELEASE_DELAY_MS,
  createGhostReleaseClock,
  shouldReleaseGhost,
  tickGhostRelease,
} from "./ghostRelease";

describe("ghostRelease", () => {
  it("does not start without direction input", () => {
    const clock = tickGhostRelease(createGhostReleaseClock(), false, 500);
    expect(clock.started).toBe(false);
    expect(shouldReleaseGhost(clock)).toBe(false);
  });

  it("releases after the delay once input has started the clock", () => {
    const beforeMs = Math.max(1, GHOST_RELEASE_DELAY_MS - 1);
    let clock = tickGhostRelease(createGhostReleaseClock(), true, beforeMs);
    expect(shouldReleaseGhost(clock)).toBe(false);
    clock = tickGhostRelease(clock, true, 1);
    expect(shouldReleaseGhost(clock)).toBe(true);
  });
});
