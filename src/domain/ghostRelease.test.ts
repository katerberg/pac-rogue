import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  BLINKY_RELEASE_DELAY_MS,
  IDLE_RELEASE_LATE_MS,
  IDLE_RELEASE_MS,
  LEVEL2_CLYDE_RELEASE_DOTS,
  PINKY_RELEASE_DELAY_MS,
  POST_LIFE_CLYDE_RELEASE_DOTS,
  POST_LIFE_INKY_RELEASE_DOTS,
  POST_LIFE_PINKY_RELEASE_DOTS,
  createGhostReleaseClock,
  idleReleaseDue,
  idleReleaseLimitMs,
  pickIdleReleaseKind,
  resetIdle,
  shouldReleaseGhostAt,
  shouldReleaseKind,
  tickGhostRelease,
} from "./ghostRelease";
import { BASE_CLYDE_RELEASE_PELLETS, BASE_INKY_RELEASE_PELLETS, activateLayout } from "./maze";

function started(level: number, baseline = 0) {
  return tickGhostRelease(createGhostReleaseClock(level, baseline), true, 1, baseline);
}

describe("ghostRelease", () => {
  it("does not start without direction input", () => {
    const clock = tickGhostRelease(createGhostReleaseClock(), false, 500);
    expect(clock.started).toBe(false);
    expect(shouldReleaseGhostAt(clock, BLINKY_RELEASE_DELAY_MS)).toBe(false);
    for (const level of [1, 3]) {
      const idle = createGhostReleaseClock(level);
      for (const kind of [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde]) {
        expect(shouldReleaseKind(kind, idle, 999)).toBe(false);
      }
    }
  });

  it("releases Blinky after his delay once input has started the clock", () => {
    let clock = tickGhostRelease(createGhostReleaseClock(), true, BLINKY_RELEASE_DELAY_MS - 1);
    expect(shouldReleaseKind(GHOST_KIND.blinky, clock, 0)).toBe(false);
    clock = tickGhostRelease(clock, true, 1);
    expect(shouldReleaseKind(GHOST_KIND.blinky, clock, 0)).toBe(true);
  });

  it("releases Pinky the moment the clock starts", () => {
    expect(PINKY_RELEASE_DELAY_MS).toBe(0);
    expect(shouldReleaseKind(GHOST_KIND.pinky, createGhostReleaseClock(), 0)).toBe(false);
    expect(shouldReleaseKind(GHOST_KIND.pinky, started(1), 0)).toBe(true);
  });

  it("level 1: Inky and Clyde use the layout-scaled dot counts", () => {
    activateLayout("maze1");
    const clock = started(1);
    expect(shouldReleaseKind(GHOST_KIND.inky, clock, BASE_INKY_RELEASE_PELLETS - 1)).toBe(false);
    expect(shouldReleaseKind(GHOST_KIND.inky, clock, BASE_INKY_RELEASE_PELLETS)).toBe(true);
    expect(shouldReleaseKind(GHOST_KIND.clyde, clock, BASE_CLYDE_RELEASE_PELLETS - 1)).toBe(false);
    expect(shouldReleaseKind(GHOST_KIND.clyde, clock, BASE_CLYDE_RELEASE_PELLETS)).toBe(true);
  });

  it("level 2: Inky is immediate, Clyde needs 50 dots", () => {
    const clock = started(2);
    expect(shouldReleaseKind(GHOST_KIND.inky, clock, 0)).toBe(true);
    expect(shouldReleaseKind(GHOST_KIND.clyde, clock, LEVEL2_CLYDE_RELEASE_DOTS - 1)).toBe(false);
    expect(shouldReleaseKind(GHOST_KIND.clyde, clock, LEVEL2_CLYDE_RELEASE_DOTS)).toBe(true);
  });

  it("level 3+: everyone is out immediately after first input", () => {
    const before = createGhostReleaseClock(3);
    expect(shouldReleaseKind(GHOST_KIND.inky, before, 0)).toBe(false);
    const clock = tickGhostRelease(before, true, BLINKY_RELEASE_DELAY_MS);
    for (const kind of [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky, GHOST_KIND.clyde]) {
      expect(shouldReleaseKind(kind, clock, 0)).toBe(true);
    }
  });

  it("after a death: shared counter releases Pinky, Inky, Clyde at 7 / 17 / 32 dots since death", () => {
    const baseline = 40;
    const clock = started(3, baseline);
    const at = (kind: (typeof GHOST_KIND)[keyof typeof GHOST_KIND], dots: number) =>
      shouldReleaseKind(kind, clock, baseline + dots, true);
    expect(at(GHOST_KIND.pinky, POST_LIFE_PINKY_RELEASE_DOTS - 1)).toBe(false);
    expect(at(GHOST_KIND.pinky, POST_LIFE_PINKY_RELEASE_DOTS)).toBe(true);
    expect(at(GHOST_KIND.inky, POST_LIFE_INKY_RELEASE_DOTS - 1)).toBe(false);
    expect(at(GHOST_KIND.inky, POST_LIFE_INKY_RELEASE_DOTS)).toBe(true);
    expect(at(GHOST_KIND.clyde, POST_LIFE_CLYDE_RELEASE_DOTS - 1)).toBe(false);
    expect(at(GHOST_KIND.clyde, POST_LIFE_CLYDE_RELEASE_DOTS)).toBe(true);
    expect(shouldReleaseKind(GHOST_KIND.inky, clock, baseline, true)).toBe(false);
  });

  it("after a death: Blinky still uses his time delay", () => {
    const clock = tickGhostRelease(
      createGhostReleaseClock(3, 10),
      true,
      BLINKY_RELEASE_DELAY_MS,
      10,
    );
    expect(shouldReleaseKind(GHOST_KIND.blinky, clock, 10, true)).toBe(true);
  });

  describe("idle release", () => {
    it("uses 4s on levels 1-4 and 3s from level 5", () => {
      expect(idleReleaseLimitMs(1)).toBe(IDLE_RELEASE_MS);
      expect(idleReleaseLimitMs(4)).toBe(IDLE_RELEASE_MS);
      expect(idleReleaseLimitMs(5)).toBe(IDLE_RELEASE_LATE_MS);
      expect(idleReleaseLimitMs(8, 2000)).toBe(IDLE_RELEASE_LATE_MS + 2000);
    });

    it("waits for the clock to start, and fires at the limit", () => {
      expect(idleReleaseDue(tickGhostRelease(createGhostReleaseClock(1), false, 9999))).toBe(false);
      let clock = tickGhostRelease(createGhostReleaseClock(1), true, IDLE_RELEASE_MS - 1);
      expect(idleReleaseDue(clock)).toBe(false);
      clock = tickGhostRelease(clock, true, 1);
      expect(idleReleaseDue(clock)).toBe(true);
      expect(idleReleaseDue(clock, 2000)).toBe(false);
    });

    it("resets when a dot is eaten or resetIdle is called", () => {
      let clock = tickGhostRelease(createGhostReleaseClock(1), true, IDLE_RELEASE_MS - 1, 0);
      clock = tickGhostRelease(clock, true, 1, 1);
      expect(clock.idleMs).toBe(0);
      clock = tickGhostRelease(clock, true, IDLE_RELEASE_MS, 1);
      expect(idleReleaseDue(clock)).toBe(true);
      expect(idleReleaseDue(resetIdle(clock))).toBe(false);
    });

    it("picks Blinky, Pinky, Inky, then Clyde", () => {
      expect(pickIdleReleaseKind([GHOST_KIND.clyde, GHOST_KIND.inky])).toBe(GHOST_KIND.inky);
      expect(pickIdleReleaseKind([GHOST_KIND.clyde, GHOST_KIND.pinky])).toBe(GHOST_KIND.pinky);
      expect(pickIdleReleaseKind([])).toBeNull();
    });
  });

  describe("House Delay adds", () => {
    const adds = { delayAddMs: 2000, clydePelletAdd: 15 };

    it("extends the Blinky and first-life Pinky time gates", () => {
      const early = tickGhostRelease(createGhostReleaseClock(3), true, 1999);
      expect(shouldReleaseKind(GHOST_KIND.pinky, early, 0, false, adds)).toBe(false);
      const ready = tickGhostRelease(early, true, 1);
      expect(shouldReleaseKind(GHOST_KIND.pinky, ready, 0, false, adds)).toBe(true);
      expect(shouldReleaseKind(GHOST_KIND.blinky, ready, 0, false, adds)).toBe(false);
      expect(
        shouldReleaseKind(GHOST_KIND.blinky, tickGhostRelease(ready, true, 100), 0, false, adds),
      ).toBe(true);
    });

    it("raises Clyde's dot count on the first life and after a death", () => {
      const clock = started(2);
      const gate = LEVEL2_CLYDE_RELEASE_DOTS + 15;
      expect(shouldReleaseKind(GHOST_KIND.clyde, clock, gate - 1, false, adds)).toBe(false);
      expect(shouldReleaseKind(GHOST_KIND.clyde, clock, gate, false, adds)).toBe(true);
      const post = POST_LIFE_CLYDE_RELEASE_DOTS + 15;
      expect(shouldReleaseKind(GHOST_KIND.clyde, clock, post - 1, true, adds)).toBe(false);
      expect(shouldReleaseKind(GHOST_KIND.clyde, clock, post, true, adds)).toBe(true);
    });
  });
});
