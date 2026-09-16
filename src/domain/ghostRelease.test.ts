import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  BLINKY_RELEASE_DELAY_MS,
  PINKY_RELEASE_DELAY_MS,
  createGhostReleaseClock,
  releaseDelayForKind,
  shouldReleaseGhostAt,
  tickGhostRelease,
} from "./ghostRelease";

describe("ghostRelease", () => {
  it("does not start without direction input", () => {
    const clock = tickGhostRelease(createGhostReleaseClock(), false, 500);
    expect(clock.started).toBe(false);
    expect(shouldReleaseGhostAt(clock, BLINKY_RELEASE_DELAY_MS)).toBe(false);
  });

  it("releases Blinky after his delay once input has started the clock", () => {
    const beforeMs = Math.max(1, BLINKY_RELEASE_DELAY_MS - 1);
    let clock = tickGhostRelease(createGhostReleaseClock(), true, beforeMs);
    expect(shouldReleaseGhostAt(clock, BLINKY_RELEASE_DELAY_MS)).toBe(false);
    clock = tickGhostRelease(clock, true, 1);
    expect(shouldReleaseGhostAt(clock, BLINKY_RELEASE_DELAY_MS)).toBe(true);
  });

  it("keeps Pinky in house until the Pinky delay", () => {
    let clock = tickGhostRelease(createGhostReleaseClock(), true, BLINKY_RELEASE_DELAY_MS);
    expect(shouldReleaseGhostAt(clock, BLINKY_RELEASE_DELAY_MS)).toBe(true);
    expect(shouldReleaseGhostAt(clock, PINKY_RELEASE_DELAY_MS)).toBe(false);
    clock = tickGhostRelease(clock, true, PINKY_RELEASE_DELAY_MS - BLINKY_RELEASE_DELAY_MS);
    expect(shouldReleaseGhostAt(clock, PINKY_RELEASE_DELAY_MS)).toBe(true);
  });

  it("maps kinds to their release delays", () => {
    expect(releaseDelayForKind(GHOST_KIND.blinky)).toBe(BLINKY_RELEASE_DELAY_MS);
    expect(releaseDelayForKind(GHOST_KIND.pinky)).toBe(PINKY_RELEASE_DELAY_MS);
  });
});
