import { describe, expect, it } from "vitest";
import {
  NO_SHIELD_BOUNCE,
  SHIELD_BOUNCE_MS,
  SHIELD_BOUNCE_TILES,
  bounceArcPx,
  bounceAwaySteps,
  bounceTravelPx,
  maskStaleKeys,
  mergeShieldBounce,
  shieldBounceCatchSkips,
  shieldBounceHeldGhosts,
  shieldBounceSpriteOffsets,
} from "./shieldBounce";

const LEFT = { dx: -1, dy: 0 };

describe("bounceAwaySteps", () => {
  it("sends the player away from the ghost on the dominant axis and the ghost the other way", () => {
    expect(bounceAwaySteps({ x: 10, y: 0 }, { x: 4, y: 2 }, LEFT)).toEqual({
      player: { dx: 1, dy: 0 },
      ghost: { dx: -1, dy: 0 },
    });
    expect(bounceAwaySteps({ x: 0, y: 0 }, { x: 1, y: 5 }, LEFT)).toEqual({
      player: { dx: 0, dy: -1 },
      ghost: { dx: 0, dy: 1 },
    });
  });

  it("uses the fallback when they sit exactly on top of each other", () => {
    expect(bounceAwaySteps({ x: 3, y: 3 }, { x: 3, y: 3 }, LEFT)).toEqual({
      player: LEFT,
      ghost: { dx: 1, dy: 0 },
    });
  });
});

describe("bounce timing", () => {
  it("covers the full distance over SHIELD_BOUNCE_MS and nothing after", () => {
    let travelled = 0;
    for (let ms = 0; ms < SHIELD_BOUNCE_MS; ms += 10) {
      travelled += bounceTravelPx(ms, 10, 16);
    }
    expect(travelled).toBeCloseTo(SHIELD_BOUNCE_TILES * 16);
    expect(bounceTravelPx(SHIELD_BOUNCE_MS, 16, 16)).toBe(0);
  });

  it("arcs from the ground up and back down", () => {
    expect(bounceArcPx(0, 16)).toBe(0);
    expect(bounceArcPx(SHIELD_BOUNCE_MS / 2, 16)).toBeGreaterThan(bounceArcPx(50, 16));
    expect(bounceArcPx(SHIELD_BOUNCE_MS, 16)).toBeCloseTo(0);
  });
});

describe("shield bounce state", () => {
  const bounce = {
    player: { eid: 1, step: LEFT, elapsedMs: 0 },
    ghosts: [{ eid: 2, step: { dx: 1, dy: 0 }, elapsedMs: 0 }],
    stunned: [{ eid: 3, remainingMs: 100 }],
  };

  it("skips stunned ghosts for catches only while the player is still airborne", () => {
    expect([...shieldBounceCatchSkips(bounce)].sort()).toEqual([2, 3]);
    expect([...shieldBounceCatchSkips({ ...bounce, player: null })]).toEqual([2]);
    expect([...shieldBounceHeldGhosts({ ...bounce, player: null })].sort()).toEqual([2, 3]);
  });

  it("lifts bouncing bodies and shakes stunned ghosts sideways", () => {
    const offsets = shieldBounceSpriteOffsets(
      { ...bounce, player: { ...bounce.player, elapsedMs: 150 } },
      16,
    )!;
    expect(offsets[1]!.y).toBeLessThan(0);
    expect(offsets[3]!.y).toBe(0);
    expect(shieldBounceSpriteOffsets(NO_SHIELD_BOUNCE, 16)).toBeUndefined();
  });

  it("restarts a stunned ghost that bounces again", () => {
    const merged = mergeShieldBounce(bounce, {
      player: null,
      ghosts: [{ eid: 3, step: LEFT, elapsedMs: 0 }],
      stunned: [],
    });
    expect(merged.player).toBe(bounce.player);
    expect(merged.ghosts.map((body) => body.eid)).toEqual([2, 3]);
    expect(merged.stunned).toEqual([]);
  });
});

describe("maskStaleKeys", () => {
  it("drops keys still held from before the bounce and keeps fresh presses", () => {
    const stale = { left: 5, right: null };
    expect(maskStaleKeys({ left: 5, right: 9 }, stale)).toEqual({ left: null, right: 9 });
    expect(maskStaleKeys({ left: 6, right: null }, stale)).toEqual({ left: 6, right: null });
    expect(maskStaleKeys({ left: 5, right: null }, null)).toEqual({ left: 5, right: null });
  });
});
