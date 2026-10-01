import { describe, expect, it } from "vitest";
import {
  createTimeBonusDrain,
  tickTimeBonusDrain,
  TIME_BONUS_DRAIN_MS,
  timeBonusPoints,
  type TimeBonusTick,
} from "./timeBonus";

const FRAME_MS = 1000 / 60;

function drainAll(remaining: number): TimeBonusTick[] {
  let drain = createTimeBonusDrain(remaining)!;
  const ticks: TimeBonusTick[] = [];
  for (let i = 0; i < 200; i += 1) {
    const tick = tickTimeBonusDrain(drain, FRAME_MS);
    ticks.push(tick);
    drain = tick.drain;
    if (tick.done) {
      break;
    }
  }
  return ticks;
}

describe("timeBonusPoints", () => {
  it("pays one point per half second left", () => {
    expect(timeBonusPoints(450)).toBe(90);
    expect(timeBonusPoints(999)).toBe(199);
    expect(timeBonusPoints(4)).toBe(0);
  });
});

describe("createTimeBonusDrain", () => {
  it("skips an empty timer", () => {
    expect(createTimeBonusDrain(0)).toBeNull();
  });
});

describe("tickTimeBonusDrain", () => {
  it("drains the full timer in a fixed time and pays every point once", () => {
    const ticks = drainAll(999);
    const last = ticks[ticks.length - 1]!;
    expect(last.done).toBe(true);
    expect(ticks.length * FRAME_MS).toBeLessThanOrEqual(TIME_BONUS_DRAIN_MS + FRAME_MS);
    expect(ticks.reduce((sum, t) => sum + t.points, 0)).toBe(199);
    expect(last.remaining).toBe(0);
    const remaining = ticks.map((t) => t.remaining);
    expect(remaining).toEqual([...remaining].sort((a, b) => b - a));
  });

  it("takes the same time for a small remainder", () => {
    const ticks = drainAll(12);
    expect(ticks.length * FRAME_MS).toBeGreaterThan(TIME_BONUS_DRAIN_MS - FRAME_MS);
    expect(ticks.reduce((sum, t) => sum + t.points, 0)).toBe(2);
  });
});
