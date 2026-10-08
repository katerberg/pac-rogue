import { describe, expect, it } from "vitest";
import {
  HUD_ICON_GAP,
  HUD_ICON_LEFT_X,
  SHIELD_CRACK_FALL_PX,
  SHIELD_CRACK_MS,
  SHIELD_CRACK_SPLIT_PX,
  SHIELD_HUD_SIZE_FRAC,
  hudIconCenterY,
  hudIconsThatFit,
  shieldCrackLook,
  shieldCrackProgress,
  shieldHudIconX,
  shieldHudIconsThatFit,
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

describe("hudIconsThatFit", () => {
  it("returns the full count when every icon clears the maze left edge", () => {
    expect(hudIconsThatFit(3, 10, 200)).toBe(3);
  });

  it("stops before an icon that would cross the maze", () => {
    const size = 10;
    const twoIconRight = HUD_ICON_LEFT_X + 2 * size + HUD_ICON_GAP;
    expect(hudIconsThatFit(5, size, twoIconRight)).toBe(2);
    expect(hudIconsThatFit(5, size, twoIconRight - 1)).toBe(1);
    expect(hudIconsThatFit(5, size, HUD_ICON_LEFT_X + size)).toBe(1);
    expect(hudIconsThatFit(5, size, HUD_ICON_LEFT_X + size - 1)).toBe(0);
  });
});

describe("shieldHudIconsThatFit", () => {
  it("keeps shields that stay left of the maze after the life row", () => {
    const lifeSize = 10;
    const shieldSize = lifeSize * SHIELD_HUD_SIZE_FRAC;
    const firstRight = shieldHudIconX(2, 0, lifeSize) + shieldSize / 2;
    expect(shieldHudIconsThatFit(3, 2, lifeSize, firstRight)).toBe(1);
    expect(shieldHudIconsThatFit(3, 2, lifeSize, firstRight - 1)).toBe(0);
  });
});

describe("hudIconCenterY", () => {
  it("matches the lives bottom inset", () => {
    expect(hudIconCenterY(17, 600, 8)).toBe(600 - 8 - 17 / 2);
  });
});
