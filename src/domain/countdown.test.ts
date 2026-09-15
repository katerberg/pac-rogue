import { describe, expect, it } from "vitest";
import { COUNTDOWN_START, COUNTDOWN_TICK_MS, advanceCountdown } from "./countdown";

describe("advanceCountdown", () => {
  it("does not change before one tick interval", () => {
    expect(advanceCountdown(COUNTDOWN_START, 0, COUNTDOWN_TICK_MS - 1)).toEqual({
      remaining: COUNTDOWN_START,
      carryMs: COUNTDOWN_TICK_MS - 1,
    });
  });

  it("decrements by 1 at exactly one tick interval", () => {
    expect(advanceCountdown(COUNTDOWN_START, 0, COUNTDOWN_TICK_MS)).toEqual({
      remaining: COUNTDOWN_START - 1,
      carryMs: 0,
    });
  });

  it("applies multiple ticks from a large delta", () => {
    expect(advanceCountdown(100, 0, COUNTDOWN_TICK_MS * 3 + 25)).toEqual({
      remaining: 97,
      carryMs: 25,
    });
  });

  it("never goes below 0", () => {
    expect(advanceCountdown(2, 0, COUNTDOWN_TICK_MS * 10)).toEqual({
      remaining: 0,
      carryMs: 0,
    });
  });

  it("stays at 0 when already 0", () => {
    expect(advanceCountdown(0, 50, COUNTDOWN_TICK_MS)).toEqual({
      remaining: 0,
      carryMs: 0,
    });
  });

  it("carries leftover ms across calls", () => {
    const first = advanceCountdown(50, 0, 60);
    expect(first).toEqual({ remaining: 50, carryMs: 60 });
    expect(advanceCountdown(first.remaining, first.carryMs, 40)).toEqual({
      remaining: 49,
      carryMs: 0,
    });
  });
});
