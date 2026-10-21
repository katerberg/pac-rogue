import { describe, expect, it } from "vitest";
import {
  BUBBLE_SHIELD_ART_SIZE_PX,
  BUBBLE_SHIELD_MULTI_KEY,
  BUBBLE_SHIELD_PAD_PX,
  BUBBLE_SHIELD_SINGLE_KEY,
  bubbleShieldCrackHalfPose,
  bubbleShieldCracksAfterDrop,
  bubbleShieldDisplaySize,
  bubbleShieldTextureKey,
} from "./bubbleShield";
import { SHIELD_CRACK_MS, SHIELD_CRACK_SPLIT_PX } from "./shieldCrack";

describe("bubbleShieldTextureKey", () => {
  it("picks single, multi, or none from the banked count", () => {
    expect(bubbleShieldTextureKey(0)).toBeNull();
    expect(bubbleShieldTextureKey(1)).toBe(BUBBLE_SHIELD_SINGLE_KEY);
    expect(bubbleShieldTextureKey(2)).toBe(BUBBLE_SHIELD_MULTI_KEY);
    expect(bubbleShieldTextureKey(5)).toBe(BUBBLE_SHIELD_MULTI_KEY);
  });
});

describe("bubbleShieldDisplaySize", () => {
  it("pads Dot-Man's display size on both sides", () => {
    expect(bubbleShieldDisplaySize(24.5)).toBe(24.5 + 2 * BUBBLE_SHIELD_PAD_PX);
  });
});

describe("bubbleShieldCracksAfterDrop", () => {
  it("spawns one crack per lost shield using the pre-drop texture", () => {
    const at = { x: 10, y: 20 };
    const dropped = bubbleShieldCracksAfterDrop(2, 1, at, 100, []);
    expect(dropped.shields).toBe(1);
    expect(dropped.cracks).toEqual([
      { x: 10, y: 20, startMs: 100, textureKey: BUBBLE_SHIELD_MULTI_KEY },
    ]);
    const last = bubbleShieldCracksAfterDrop(1, 0, at, 200, dropped.cracks);
    expect(last.cracks).toHaveLength(2);
    expect(last.cracks[1]).toMatchObject({
      startMs: 200,
      textureKey: BUBBLE_SHIELD_SINGLE_KEY,
    });
  });

  it("does not crack when shields rise or stay put", () => {
    expect(bubbleShieldCracksAfterDrop(0, 1, { x: 0, y: 0 }, 0, []).cracks).toEqual([]);
    expect(bubbleShieldCracksAfterDrop(2, 2, { x: 0, y: 0 }, 0, []).cracks).toEqual([]);
  });

  it("drops finished cracks", () => {
    const stale = {
      x: 0,
      y: 0,
      startMs: 0,
      textureKey: BUBBLE_SHIELD_SINGLE_KEY,
    };
    const kept = bubbleShieldCracksAfterDrop(1, 1, { x: 0, y: 0 }, SHIELD_CRACK_MS, [stale]);
    expect(kept.cracks).toEqual([]);
  });
});

describe("bubbleShieldCrackHalfPose", () => {
  it("splits left and right like the old square halves", () => {
    const size = 32;
    const left = bubbleShieldCrackHalfPose({ x: 100, y: 50 }, -1, size, 1);
    const right = bubbleShieldCrackHalfPose({ x: 100, y: 50 }, 1, size, 1);
    expect(left.x).toBe(100 - (size / 4 + SHIELD_CRACK_SPLIT_PX));
    expect(right.x).toBe(100 + (size / 4 + SHIELD_CRACK_SPLIT_PX));
    expect(left.cropX).toBe(0);
    expect(right.cropX).toBe(BUBBLE_SHIELD_ART_SIZE_PX / 2);
    expect(left.displayWidth).toBe(size / 2);
    expect(left.alpha).toBe(0);
  });
});
