import { describe, expect, it } from "vitest";
import { DEATH_FADE_START_MS, beginDeathSequence, tickDeathSequence } from "./deathSequence";

describe("tickDeathSequence", () => {
  it("does not start fade before the fade start threshold", () => {
    const started = beginDeathSequence();
    const tick = tickDeathSequence(started, DEATH_FADE_START_MS - 1);
    expect(tick.shouldStartFade).toBe(false);
    expect(tick.state).toEqual({
      elapsedMs: DEATH_FADE_START_MS - 1,
      fadeStarted: false,
    });
  });

  it("starts fade once at exactly the fade start threshold", () => {
    const started = beginDeathSequence();
    const tick = tickDeathSequence(started, DEATH_FADE_START_MS);
    expect(tick.shouldStartFade).toBe(true);
    expect(tick.state).toEqual({
      elapsedMs: DEATH_FADE_START_MS,
      fadeStarted: true,
    });
  });

  it("does not re-signal fade after it has started", () => {
    const afterStart = tickDeathSequence(beginDeathSequence(), DEATH_FADE_START_MS);
    const next = tickDeathSequence(afterStart.state, 100);
    expect(next.shouldStartFade).toBe(false);
    expect(next.state.fadeStarted).toBe(true);
    expect(next.state.elapsedMs).toBe(DEATH_FADE_START_MS + 100);
  });

  it("starts fade when a large delta crosses the threshold", () => {
    const tick = tickDeathSequence(beginDeathSequence(), DEATH_FADE_START_MS + 250);
    expect(tick.shouldStartFade).toBe(true);
    expect(tick.state.fadeStarted).toBe(true);
  });
});
