import { describe, expect, it } from "vitest";
import {
  UPGRADE_HUD_COLUMNS,
  UPGRADE_HUD_COMPACT_SIZE,
  upgradeHudIconPosition,
  upgradeHudIconSize,
} from "./upgradeHud";

describe("upgradeHudIconSize", () => {
  it("fits three icons and their gaps between the left margin and the maze", () => {
    const size = upgradeHudIconSize(200);
    expect(12 + size * 3 + 4 * 2).toBeLessThanOrEqual(200 - 8);
    expect(12 + (size + 1) * 3 + 4 * 2).toBeGreaterThan(200 - 8);
  });

  it("never shrinks below the compact size", () => {
    expect(upgradeHudIconSize(40)).toBe(UPGRADE_HUD_COMPACT_SIZE);
  });
});

describe("upgradeHudIconPosition", () => {
  it("starts right below the quarters row", () => {
    expect(upgradeHudIconPosition(0, 16, 10)).toEqual({ x: 20, y: 34 });
  });

  it("fills three per row, left to right", () => {
    const xs = [0, 1, 2].map((i) => upgradeHudIconPosition(i, 16, 10).x);
    expect(xs).toEqual([20, 40, 60]);
    expect(upgradeHudIconPosition(UPGRADE_HUD_COLUMNS - 1, 16, 10).y).toBe(
      upgradeHudIconPosition(0, 16, 10).y,
    );
  });

  it("wraps to a new row after three, stacking downward by the icon size plus gap", () => {
    const first = upgradeHudIconPosition(0, 40, 10);
    const fourth = upgradeHudIconPosition(3, 40, 10);
    expect(fourth.x).toBe(first.x);
    expect(fourth.y).toBe(first.y + 44);
  });

  it("honors a shifted left edge", () => {
    expect(upgradeHudIconPosition(0, 16, 10, 84).x).toBe(92);
  });
});
