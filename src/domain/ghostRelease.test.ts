import { describe, expect, it } from "vitest";
import { RELEASE_SLOT, type ReleaseSlot } from "./ghostRoster";
import {
  ANCHOR_RELEASE_DELAY_MS,
  IDLE_RELEASE_LATE_MS,
  IDLE_RELEASE_MS,
  LEVEL2_RELIEF_RELEASE_DOTS,
  FRONT_RELEASE_DELAY_MS,
  POST_LIFE_RELIEF_RELEASE_DOTS,
  POST_LIFE_FLANK_RELEASE_DOTS,
  POST_LIFE_FRONT_RELEASE_DOTS,
  createGhostReleaseClock,
  idleReleaseDue,
  idleReleaseLimitMs,
  resetIdle,
  shouldReleaseGhostAt,
  shouldReleaseSlot,
  tickGhostRelease,
} from "./ghostRelease";
import { BASE_RELIEF_RELEASE_PELLETS, BASE_FLANK_RELEASE_PELLETS, activateLayout } from "./maze";

function started(level: number, baseline = 0) {
  return tickGhostRelease(createGhostReleaseClock(level, baseline), true, 1, baseline);
}

describe("ghostRelease", () => {
  it("does not start without direction input", () => {
    const clock = tickGhostRelease(createGhostReleaseClock(), false, 500);
    expect(clock.started).toBe(false);
    expect(shouldReleaseGhostAt(clock, ANCHOR_RELEASE_DELAY_MS)).toBe(false);
    for (const level of [1, 3]) {
      const idle = createGhostReleaseClock(level);
      for (const slot of [
        RELEASE_SLOT.anchor,
        RELEASE_SLOT.front,
        RELEASE_SLOT.flank,
        RELEASE_SLOT.relief,
      ]) {
        expect(shouldReleaseSlot(slot, idle, 999)).toBe(false);
      }
    }
  });

  it("releases the anchor after its delay once input has started the clock", () => {
    let clock = tickGhostRelease(createGhostReleaseClock(), true, ANCHOR_RELEASE_DELAY_MS - 1);
    expect(shouldReleaseSlot(RELEASE_SLOT.anchor, clock, 0)).toBe(false);
    clock = tickGhostRelease(clock, true, 1);
    expect(shouldReleaseSlot(RELEASE_SLOT.anchor, clock, 0)).toBe(true);
  });

  it("releases the front arm the moment the clock starts", () => {
    expect(FRONT_RELEASE_DELAY_MS).toBe(0);
    expect(shouldReleaseSlot(RELEASE_SLOT.front, createGhostReleaseClock(), 0)).toBe(false);
    expect(shouldReleaseSlot(RELEASE_SLOT.front, started(1), 0)).toBe(true);
  });

  it("level 1: the flank and relief slots use the layout-scaled dot counts", () => {
    activateLayout("maze1");
    const clock = started(1);
    expect(shouldReleaseSlot(RELEASE_SLOT.flank, clock, BASE_FLANK_RELEASE_PELLETS - 1)).toBe(
      false,
    );
    expect(shouldReleaseSlot(RELEASE_SLOT.flank, clock, BASE_FLANK_RELEASE_PELLETS)).toBe(true);
    expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, BASE_RELIEF_RELEASE_PELLETS - 1)).toBe(
      false,
    );
    expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, BASE_RELIEF_RELEASE_PELLETS)).toBe(true);
  });

  it("level 2: the flank slot is immediate, the relief slot needs 50 dots", () => {
    const clock = started(2);
    expect(shouldReleaseSlot(RELEASE_SLOT.flank, clock, 0)).toBe(true);
    expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, LEVEL2_RELIEF_RELEASE_DOTS - 1)).toBe(
      false,
    );
    expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, LEVEL2_RELIEF_RELEASE_DOTS)).toBe(true);
  });

  it("level 3+: everyone is out immediately after first input", () => {
    const before = createGhostReleaseClock(3);
    expect(shouldReleaseSlot(RELEASE_SLOT.flank, before, 0)).toBe(false);
    const clock = tickGhostRelease(before, true, ANCHOR_RELEASE_DELAY_MS);
    for (const slot of [
      RELEASE_SLOT.anchor,
      RELEASE_SLOT.front,
      RELEASE_SLOT.flank,
      RELEASE_SLOT.relief,
    ]) {
      expect(shouldReleaseSlot(slot, clock, 0)).toBe(true);
    }
  });

  it("after a death: shared counter releases the front, flank and relief slots at 7 / 17 / 32 dots since death", () => {
    const baseline = 40;
    const clock = started(3, baseline);
    const at = (slot: ReleaseSlot, dots: number) =>
      shouldReleaseSlot(slot, clock, baseline + dots, true);
    expect(at(RELEASE_SLOT.front, POST_LIFE_FRONT_RELEASE_DOTS - 1)).toBe(false);
    expect(at(RELEASE_SLOT.front, POST_LIFE_FRONT_RELEASE_DOTS)).toBe(true);
    expect(at(RELEASE_SLOT.flank, POST_LIFE_FLANK_RELEASE_DOTS - 1)).toBe(false);
    expect(at(RELEASE_SLOT.flank, POST_LIFE_FLANK_RELEASE_DOTS)).toBe(true);
    expect(at(RELEASE_SLOT.relief, POST_LIFE_RELIEF_RELEASE_DOTS - 1)).toBe(false);
    expect(at(RELEASE_SLOT.relief, POST_LIFE_RELIEF_RELEASE_DOTS)).toBe(true);
    expect(shouldReleaseSlot(RELEASE_SLOT.flank, clock, baseline, true)).toBe(false);
  });

  it("after a death: the anchor still uses its time delay", () => {
    const clock = tickGhostRelease(
      createGhostReleaseClock(3, 10),
      true,
      ANCHOR_RELEASE_DELAY_MS,
      10,
    );
    expect(shouldReleaseSlot(RELEASE_SLOT.anchor, clock, 10, true)).toBe(true);
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
  });

  describe("House Delay adds", () => {
    const adds = { delayAddMs: 2000, reliefPelletAdd: 15 };

    it("extends the anchor and first-life front-arm time gates", () => {
      const early = tickGhostRelease(createGhostReleaseClock(3), true, 1999);
      expect(shouldReleaseSlot(RELEASE_SLOT.front, early, 0, false, adds)).toBe(false);
      const ready = tickGhostRelease(early, true, 1);
      expect(shouldReleaseSlot(RELEASE_SLOT.front, ready, 0, false, adds)).toBe(true);
      expect(shouldReleaseSlot(RELEASE_SLOT.anchor, ready, 0, false, adds)).toBe(false);
      expect(
        shouldReleaseSlot(RELEASE_SLOT.anchor, tickGhostRelease(ready, true, 100), 0, false, adds),
      ).toBe(true);
    });

    it("raises the relief slot's dot count on the first life and after a death", () => {
      const clock = started(2);
      const gate = LEVEL2_RELIEF_RELEASE_DOTS + 15;
      expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, gate - 1, false, adds)).toBe(false);
      expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, gate, false, adds)).toBe(true);
      const post = POST_LIFE_RELIEF_RELEASE_DOTS + 15;
      expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, post - 1, true, adds)).toBe(false);
      expect(shouldReleaseSlot(RELEASE_SLOT.relief, clock, post, true, adds)).toBe(true);
    });
  });
});
