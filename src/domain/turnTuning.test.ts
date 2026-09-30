import { describe, expect, it } from "vitest";
import {
  TURN_TUNING_BOOST_MS,
  TURN_TUNING_BOOST_MUL,
  tickTurnBoost,
  turnBoostMultiplier,
} from "./turnTuning";

describe("turnBoostMultiplier", () => {
  it("is the full boost at the start, eases linearly to 1, and is 1 when idle", () => {
    expect(turnBoostMultiplier(TURN_TUNING_BOOST_MS)).toBeCloseTo(TURN_TUNING_BOOST_MUL);
    expect(turnBoostMultiplier(TURN_TUNING_BOOST_MS / 2)).toBeCloseTo(
      1 + (TURN_TUNING_BOOST_MUL - 1) / 2,
    );
    expect(turnBoostMultiplier(0)).toBe(1);
  });
});

describe("tickTurnBoost", () => {
  it("counts down and clamps at zero", () => {
    expect(tickTurnBoost(500, 100)).toBe(400);
    expect(tickTurnBoost(50, 100)).toBe(0);
  });
});
