import { describe, expect, it } from "vitest";
import {
  startWarpGlide,
  tickWarpGlide,
  WARP_GLIDE_MS,
  warpGlideRemainingMs,
  warpGlideSprites,
} from "./warpGlide";

const from = { x: 10, y: 20 };
const to = { x: 110, y: 220 };

describe("warpGlide", () => {
  it("ends after WARP_GLIDE_MS", () => {
    const glide = startWarpGlide(from, to);
    const mid = tickWarpGlide(glide, WARP_GLIDE_MS - 1);
    expect(mid).not.toBeNull();
    expect(warpGlideRemainingMs(mid)).toBe(1);
    expect(tickWarpGlide(mid!, 1)).toBeNull();
    expect(warpGlideRemainingMs(null)).toBe(0);
  });

  it("starts the head at the origin and eases it to the destination", () => {
    const start = warpGlideSprites(startWarpGlide(from, to));
    expect(start[0]).toMatchObject(from);
    const half = warpGlideSprites({ from, to, elapsedMs: WARP_GLIDE_MS / 2 });
    expect(half[0]!.x).toBeCloseTo(60);
    expect(half[0]!.y).toBeCloseTo(120);
    const late = warpGlideSprites({ from, to, elapsedMs: WARP_GLIDE_MS - 1 });
    expect(late[0]!.x).toBeCloseTo(to.x, 0);
    expect(late[0]!.alpha).toBeGreaterThan(0.95);
  });

  it("trails fainter afterimages behind the head", () => {
    const sprites = warpGlideSprites({ from, to, elapsedMs: WARP_GLIDE_MS / 2 });
    expect(sprites.length).toBeGreaterThan(1);
    for (let i = 1; i < sprites.length; i += 1) {
      expect(sprites[i]!.x).toBeLessThan(sprites[i - 1]!.x);
      expect(sprites[i]!.alpha).toBeLessThan(sprites[i - 1]!.alpha);
    }
  });
});
