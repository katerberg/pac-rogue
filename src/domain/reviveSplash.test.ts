import { describe, expect, it } from "vitest";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";
import {
  REVIVE_BOUNCE_END,
  REVIVE_BOUNCE_START,
  REVIVE_SPLASH_MS,
  reviveSplashLook,
  reviveSplashProgress,
} from "./reviveSplash";

describe("reviveSplashProgress", () => {
  it("runs 0 to 1 over the splash duration and clamps", () => {
    expect(reviveSplashProgress(-5)).toBe(0);
    expect(reviveSplashProgress(REVIVE_SPLASH_MS / 2)).toBe(0.5);
    expect(reviveSplashProgress(REVIVE_SPLASH_MS * 3)).toBe(1);
  });
});

describe("reviveSplashLook", () => {
  it("starts full playfield width and invisible", () => {
    expect(reviveSplashLook(0, 20)).toEqual({ size: PLAYFIELD_WIDTH, alpha: 0 });
  });

  it("ends at the regular size and fully opaque", () => {
    expect(reviveSplashLook(1, 20)).toEqual({ size: 20, alpha: 1 });
  });

  it("shrinks and fades in monotonically outside the bounce window", () => {
    for (const [from, to] of [
      [0, 0.3],
      [0.4, 1],
    ] as const) {
      let last = reviveSplashLook(from, 20);
      for (let i = 1; i <= 10; i += 1) {
        const next = reviveSplashLook(from + ((to - from) * i) / 10, 20);
        expect(next.size).toBeLessThan(last.size);
        expect(next.alpha).toBeGreaterThan(last.alpha);
        last = next;
      }
    }
  });

  it("bounces up in size and opacity between 30% and 40%, then rejoins the base curve", () => {
    const before = reviveSplashLook(REVIVE_BOUNCE_START, 20);
    const peak = reviveSplashLook(0.35, 20);
    const after = reviveSplashLook(REVIVE_BOUNCE_END, 20);
    const baseline = 1 - (1 - 0.35) ** 3;
    expect(peak.size).toBeGreaterThan(PLAYFIELD_WIDTH + (20 - PLAYFIELD_WIDTH) * baseline);
    expect(peak.alpha).toBeGreaterThan(0.35);
    expect(peak.size).toBeGreaterThan(after.size);
    expect(after.size).toBeLessThan(before.size);
    expect(after.alpha).toBeCloseTo(REVIVE_BOUNCE_END);
  });
});
