import { describe, expect, it } from "vitest";
import { beginDeathSequence, tickDeathSequence } from "./deathSequence";
import { DOTMAN_DEATH_ART_FRAMES, dotManDeathFrame } from "./dotManDeath";
import { DEFAULT_TUNING } from "./tuning";

const HOLD = DEFAULT_TUNING.deathHoldMs;

describe("dotManDeathFrame", () => {
  it("plays every frame across the death hold, ending on the empty one", () => {
    const at = (ms: number) =>
      dotManDeathFrame({ gameOver: false, phase: "hold", phaseElapsedMs: ms }, HOLD);
    expect(at(0)).toBe(0);
    expect(at(HOLD * 0.15)).toBe(1);
    expect(at(HOLD * 0.85)).toBe(8);
    expect(at(HOLD * 0.95)).toBe(DOTMAN_DEATH_ART_FRAMES);
    expect(at(HOLD * 2)).toBe(DOTMAN_DEATH_ART_FRAMES);
  });

  it("stays gone through the Game Over fade", () => {
    const fading = tickDeathSequence(beginDeathSequence(true), HOLD).state;
    expect(fading.phase).toBe("fadeToGameOver");
    expect(dotManDeathFrame(fading, HOLD)).toBe(DOTMAN_DEATH_ART_FRAMES);
  });

  it("hands back to the normal sprite once actors reset", () => {
    const ready = tickDeathSequence(beginDeathSequence(false), HOLD).state;
    expect(ready.phase).toBe("ready");
    expect(dotManDeathFrame(ready, HOLD)).toBeUndefined();
  });

  it("skips straight to the empty frame with no hold", () => {
    expect(dotManDeathFrame(beginDeathSequence(false), 0)).toBe(DOTMAN_DEATH_ART_FRAMES);
  });
});
