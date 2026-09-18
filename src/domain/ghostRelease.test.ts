import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  BLINKY_RELEASE_DELAY_MS,
  CLYDE_POST_LIFE_RELEASE_DELAY_MS,
  INKY_POST_LIFE_RELEASE_DELAY_MS,
  PINKY_RELEASE_DELAY_MS,
  createGhostReleaseClock,
  releaseDelayForKind,
  shouldReleaseGhostAt,
  shouldReleaseKind,
  tickGhostRelease,
} from "./ghostRelease";
import { BASE_CLYDE_RELEASE_PELLETS, BASE_INKY_RELEASE_PELLETS } from "./maze";

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
    expect(() => releaseDelayForKind(GHOST_KIND.inky)).toThrow(/pellet release/);
    expect(() => releaseDelayForKind(GHOST_KIND.clyde)).toThrow(/pellet release/);
  });

  it("releases Inky by pellet count, not the time clock", () => {
    const clock = createGhostReleaseClock();
    expect(shouldReleaseKind(GHOST_KIND.inky, clock, BASE_INKY_RELEASE_PELLETS - 1)).toBe(false);
    expect(shouldReleaseKind(GHOST_KIND.inky, clock, BASE_INKY_RELEASE_PELLETS)).toBe(true);
    const started = tickGhostRelease(createGhostReleaseClock(), true, PINKY_RELEASE_DELAY_MS);
    expect(shouldReleaseKind(GHOST_KIND.inky, started, 0)).toBe(false);
  });

  it("releases Clyde by pellet count, not the time clock", () => {
    const clock = createGhostReleaseClock();
    expect(shouldReleaseKind(GHOST_KIND.clyde, clock, BASE_CLYDE_RELEASE_PELLETS - 1)).toBe(false);
    expect(shouldReleaseKind(GHOST_KIND.clyde, clock, BASE_CLYDE_RELEASE_PELLETS)).toBe(true);
    const started = tickGhostRelease(createGhostReleaseClock(), true, PINKY_RELEASE_DELAY_MS);
    expect(shouldReleaseKind(GHOST_KIND.clyde, started, 0)).toBe(false);
  });

  it("after life loss: Inky ignores pellets and waits for the post-life delay", () => {
    const highPellets = BASE_INKY_RELEASE_PELLETS + 100;
    const idle = createGhostReleaseClock();
    expect(shouldReleaseKind(GHOST_KIND.inky, idle, highPellets, true)).toBe(false);
    const early = tickGhostRelease(
      createGhostReleaseClock(),
      true,
      INKY_POST_LIFE_RELEASE_DELAY_MS - 1,
    );
    expect(shouldReleaseKind(GHOST_KIND.inky, early, highPellets, true)).toBe(false);
    const ready = tickGhostRelease(early, true, 1);
    expect(shouldReleaseKind(GHOST_KIND.inky, ready, highPellets, true)).toBe(true);
  });

  it("after life loss: Clyde ignores pellets and waits for the post-life delay", () => {
    const highPellets = BASE_CLYDE_RELEASE_PELLETS + 100;
    const idle = createGhostReleaseClock();
    expect(shouldReleaseKind(GHOST_KIND.clyde, idle, highPellets, true)).toBe(false);
    const early = tickGhostRelease(
      createGhostReleaseClock(),
      true,
      CLYDE_POST_LIFE_RELEASE_DELAY_MS - 1,
    );
    expect(shouldReleaseKind(GHOST_KIND.clyde, early, highPellets, true)).toBe(false);
    const ready = tickGhostRelease(early, true, 1);
    expect(shouldReleaseKind(GHOST_KIND.clyde, ready, highPellets, true)).toBe(true);
  });

  describe("ghostHouseDelay adds", () => {
    const delayAddMs = 2000;
    const clydePelletAdd = 15;
    const adds = { delayAddMs, clydePelletAdd };

    it("extends Blinky and Pinky time gates by delayAddMs", () => {
      const blinkyEarly = tickGhostRelease(
        createGhostReleaseClock(),
        true,
        BLINKY_RELEASE_DELAY_MS + delayAddMs - 1,
      );
      expect(shouldReleaseKind(GHOST_KIND.blinky, blinkyEarly, 0, false, adds)).toBe(false);
      const blinkyReady = tickGhostRelease(blinkyEarly, true, 1);
      expect(shouldReleaseKind(GHOST_KIND.blinky, blinkyReady, 0, false, adds)).toBe(true);

      const pinkyEarly = tickGhostRelease(
        createGhostReleaseClock(),
        true,
        PINKY_RELEASE_DELAY_MS + delayAddMs - 1,
      );
      expect(shouldReleaseKind(GHOST_KIND.pinky, pinkyEarly, 0, false, adds)).toBe(false);
      const pinkyReady = tickGhostRelease(pinkyEarly, true, 1);
      expect(shouldReleaseKind(GHOST_KIND.pinky, pinkyReady, 0, false, adds)).toBe(true);
    });

    it("raises Clyde first-life pellet threshold and leaves Inky pellets unchanged", () => {
      const clock = createGhostReleaseClock();
      const clydeGate = BASE_CLYDE_RELEASE_PELLETS + clydePelletAdd;
      expect(shouldReleaseKind(GHOST_KIND.clyde, clock, clydeGate - 1, false, adds)).toBe(false);
      expect(shouldReleaseKind(GHOST_KIND.clyde, clock, clydeGate, false, adds)).toBe(true);
      expect(
        shouldReleaseKind(GHOST_KIND.inky, clock, BASE_INKY_RELEASE_PELLETS - 1, false, adds),
      ).toBe(false);
      expect(
        shouldReleaseKind(GHOST_KIND.inky, clock, BASE_INKY_RELEASE_PELLETS, false, adds),
      ).toBe(true);
    });

    it("extends Inky and Clyde post-life delays by delayAddMs", () => {
      const highPellets = BASE_CLYDE_RELEASE_PELLETS + 100;
      const inkyEarly = tickGhostRelease(
        createGhostReleaseClock(),
        true,
        INKY_POST_LIFE_RELEASE_DELAY_MS + delayAddMs - 1,
      );
      expect(shouldReleaseKind(GHOST_KIND.inky, inkyEarly, highPellets, true, adds)).toBe(false);
      const inkyReady = tickGhostRelease(inkyEarly, true, 1);
      expect(shouldReleaseKind(GHOST_KIND.inky, inkyReady, highPellets, true, adds)).toBe(true);

      const clydeEarly = tickGhostRelease(
        createGhostReleaseClock(),
        true,
        CLYDE_POST_LIFE_RELEASE_DELAY_MS + delayAddMs - 1,
      );
      expect(shouldReleaseKind(GHOST_KIND.clyde, clydeEarly, highPellets, true, adds)).toBe(false);
      const clydeReady = tickGhostRelease(clydeEarly, true, 1);
      expect(shouldReleaseKind(GHOST_KIND.clyde, clydeReady, highPellets, true, adds)).toBe(true);
    });

    it("without adds, baselines match today's constants", () => {
      const blinky = tickGhostRelease(createGhostReleaseClock(), true, BLINKY_RELEASE_DELAY_MS);
      expect(shouldReleaseKind(GHOST_KIND.blinky, blinky, 0)).toBe(true);
      const pinky = tickGhostRelease(createGhostReleaseClock(), true, PINKY_RELEASE_DELAY_MS);
      expect(shouldReleaseKind(GHOST_KIND.pinky, pinky, 0)).toBe(true);
      const idle = createGhostReleaseClock();
      expect(shouldReleaseKind(GHOST_KIND.clyde, idle, BASE_CLYDE_RELEASE_PELLETS)).toBe(true);
      expect(shouldReleaseKind(GHOST_KIND.inky, idle, BASE_INKY_RELEASE_PELLETS)).toBe(true);
      const inkyPost = tickGhostRelease(
        createGhostReleaseClock(),
        true,
        INKY_POST_LIFE_RELEASE_DELAY_MS,
      );
      expect(shouldReleaseKind(GHOST_KIND.inky, inkyPost, 0, true)).toBe(true);
      const clydePost = tickGhostRelease(
        createGhostReleaseClock(),
        true,
        CLYDE_POST_LIFE_RELEASE_DELAY_MS,
      );
      expect(shouldReleaseKind(GHOST_KIND.clyde, clydePost, 0, true)).toBe(true);
    });
  });
});
