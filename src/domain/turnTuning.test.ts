import { describe, expect, it } from "vitest";
import {
  TURN_FLASH_ALPHA_DROP,
  TURN_FLASH_BRIGHTEN,
  TURN_FLASH_MS,
  TURN_FLASH_SCALE,
  TURN_TUNING_BOOST_MS,
  TURN_TUNING_BOOST_MUL,
  TURN_TUNING_PERFECT_PX,
  TURN_TUNING_SPAM_MS,
  isCleanTap,
  isPerfectTurn,
  turnFlashPulse,
  tickTurnTimer,
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

describe("tickTurnTimer", () => {
  it("counts down and clamps at zero", () => {
    expect(tickTurnTimer(500, 100)).toBe(400);
    expect(tickTurnTimer(50, 100)).toBe(0);
  });
});

describe("turn beat", () => {
  it("is clean only when the key was not pressed within the spam window", () => {
    expect(isCleanTap(undefined, 1000)).toBe(true);
    expect(isCleanTap(1000 - TURN_TUNING_SPAM_MS + 1, 1000)).toBe(false);
    expect(isCleanTap(1000 - TURN_TUNING_SPAM_MS, 1000)).toBe(true);
  });

  it("is perfect only for a clean tap close to the junction", () => {
    expect(isPerfectTurn(TURN_TUNING_PERFECT_PX, true)).toBe(true);
    expect(isPerfectTurn(TURN_TUNING_PERFECT_PX + 1, true)).toBe(false);
    expect(isPerfectTurn(0, false)).toBe(false);
  });
});

describe("turnFlashPulse", () => {
  it("is neutral when idle and peaks at +30% size, 90% opacity, +20% brightness", () => {
    expect(turnFlashPulse(0)).toEqual({ scale: 1, alpha: 1, brighten: 0 });
    const peak = turnFlashPulse(TURN_FLASH_MS * 0.8);
    expect(peak.scale).toBeCloseTo(1 + TURN_FLASH_SCALE);
    expect(peak.alpha).toBeCloseTo(1 - TURN_FLASH_ALPHA_DROP);
    expect(peak.brighten).toBeCloseTo(TURN_FLASH_BRIGHTEN);
  });

  it("decays back toward neutral by the end", () => {
    expect(turnFlashPulse(1).scale).toBeLessThan(1.01);
  });
});
