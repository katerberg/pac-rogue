import { describe, expect, it } from "vitest";
import { getActiveLayout } from "./maze";
import { playerExitedTunnel } from "./tunnelExit";

describe("playerExitedTunnel", () => {
  it("reports a jump across the board on either axis", () => {
    const { cols, rows, tileSize } = getActiveLayout();
    expect(playerExitedTunnel({ x: 5, y: 40 }, { x: cols * tileSize - 5, y: 40 })).toBe(true);
    expect(playerExitedTunnel({ x: 40, y: 5 }, { x: 40, y: rows * tileSize - 5 })).toBe(true);
  });

  it("ignores ordinary movement and missing positions", () => {
    expect(playerExitedTunnel({ x: 40, y: 40 }, { x: 44, y: 40 })).toBe(false);
    expect(playerExitedTunnel(null, { x: 1, y: 1 })).toBe(false);
    expect(playerExitedTunnel({ x: 1, y: 1 }, null)).toBe(false);
  });
});
