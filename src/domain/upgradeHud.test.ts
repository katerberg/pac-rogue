import { describe, expect, it } from "vitest";
import { UPGRADE_HUD_COLUMNS, UPGRADE_HUD_ICON_SIZE, upgradeHudIconPosition } from "./upgradeHud";

describe("upgradeHudIconPosition", () => {
  it("starts right below the quarters row", () => {
    expect(upgradeHudIconPosition(0, 10)).toEqual({ x: 20, y: 34 });
  });

  it("fills three per row, left to right", () => {
    const xs = [0, 1, 2].map((i) => upgradeHudIconPosition(i, 10).x);
    expect(xs).toEqual([20, 40, 60]);
    expect(upgradeHudIconPosition(UPGRADE_HUD_COLUMNS - 1, 10).y).toBe(
      upgradeHudIconPosition(0, 10).y,
    );
  });

  it("wraps to a new row after three, stacking downward", () => {
    const first = upgradeHudIconPosition(0, 10);
    const fourth = upgradeHudIconPosition(3, 10);
    expect(fourth.x).toBe(first.x);
    expect(fourth.y).toBe(first.y + UPGRADE_HUD_ICON_SIZE + 4);
  });

  it("honors a shifted left edge", () => {
    expect(upgradeHudIconPosition(0, 10, 84).x).toBe(92);
  });
});
