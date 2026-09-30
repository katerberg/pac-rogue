import { describe, expect, it } from "vitest";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";
import { REVIVE_SPLASH_MS, reviveSplashLook, reviveSplashProgress } from "./reviveSplash";

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

  it("shrinks and fades in monotonically", () => {
    let last = reviveSplashLook(0, 20);
    for (let i = 1; i <= 10; i += 1) {
      const next = reviveSplashLook(i / 10, 20);
      expect(next.size).toBeLessThan(last.size);
      expect(next.alpha).toBeGreaterThan(last.alpha);
      last = next;
    }
  });
});
