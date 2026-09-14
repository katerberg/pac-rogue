import { describe, expect, it } from "vitest";
import { COUNTDOWN_START, COUNTDOWN_TICK_MS } from "./countdown";
import { createRunClock, tickRunClock } from "./runClock";

describe("tickRunClock", () => {
  it("does not tick before the first direction input", () => {
    const clock = createRunClock();
    expect(tickRunClock(clock, false, COUNTDOWN_TICK_MS * 5)).toEqual({
      started: false,
      remaining: COUNTDOWN_START,
      carryMs: 0,
    });
  });

  it("starts and ticks on the first direction input frame", () => {
    const clock = createRunClock();
    expect(tickRunClock(clock, true, COUNTDOWN_TICK_MS)).toEqual({
      started: true,
      remaining: COUNTDOWN_START - 1,
      carryMs: 0,
    });
  });

  it("keeps ticking after start even without continued input", () => {
    const started = tickRunClock(createRunClock(), true, 0);
    expect(tickRunClock(started, false, COUNTDOWN_TICK_MS)).toEqual({
      started: true,
      remaining: COUNTDOWN_START - 1,
      carryMs: 0,
    });
  });

  it("clamps at 0 and clears carry", () => {
    let clock = { started: true, remaining: 2, carryMs: 0 };
    clock = tickRunClock(clock, false, COUNTDOWN_TICK_MS * 10);
    expect(clock).toEqual({ started: true, remaining: 0, carryMs: 0 });
    expect(tickRunClock(clock, false, COUNTDOWN_TICK_MS)).toEqual({
      started: true,
      remaining: 0,
      carryMs: 0,
    });
  });

  it("carries leftover ms across frames", () => {
    const started = tickRunClock(createRunClock(), true, 60);
    expect(started).toEqual({
      started: true,
      remaining: COUNTDOWN_START,
      carryMs: 60,
    });
    expect(tickRunClock(started, false, 40)).toEqual({
      started: true,
      remaining: COUNTDOWN_START - 1,
      carryMs: 0,
    });
  });
});
