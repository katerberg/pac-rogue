import { describe, expect, it } from "vitest";
import {
  SHIELD_CRACK_FALL_PX,
  SHIELD_CRACK_MS,
  SHIELD_CRACK_SPLIT_PX,
  shieldCrackLook,
  shieldCrackProgress,
  shieldHudIconX,
} from "./shieldCrack";

describe("shieldCrackProgress", () => {
  it("runs 0 to 1 over SHIELD_CRACK_MS and clamps", () => {
    expect(shieldCrackProgress(0)).toBe(0);
    expect(shieldCrackProgress(SHIELD_CRACK_MS / 2)).toBe(0.5);
    expect(shieldCrackProgress(SHIELD_CRACK_MS * 2)).toBe(1);
  });
});

describe("shieldCrackLook", () => {
  it("starts whole and ends split, fallen and faded", () => {
    expect(shieldCrackLook(0)).toEqual({ offsetX: 0, dropY: 0, rotation: 0, alpha: 1 });
    const end = shieldCrackLook(1);
    expect(end.offsetX).toBe(SHIELD_CRACK_SPLIT_PX);
    expect(end.dropY).toBe(SHIELD_CRACK_FALL_PX);
    expect(end.alpha).toBe(0);
  });

  it("splits fast then falls faster", () => {
    const mid = shieldCrackLook(0.5);
    expect(mid.offsetX).toBeGreaterThan(SHIELD_CRACK_SPLIT_PX / 2);
    expect(mid.dropY).toBeLessThan(SHIELD_CRACK_FALL_PX / 2);
  });
});

describe("shieldHudIconX", () => {
  it("places shields right of the life icons", () => {
    const lifeSize = 10;
    const lastLifeRight = 12 + 2 * (lifeSize + 4) - 4;
    const first = shieldHudIconX(2, 0, lifeSize);
    expect(first - 3).toBeGreaterThan(lastLifeRight);
    expect(shieldHudIconX(2, 1, lifeSize) - first).toBe(6 + 4);
  });

  it("starts at the left edge with no life icons", () => {
    expect(shieldHudIconX(0, 0, 10)).toBe(12 + 3);
  });
});
