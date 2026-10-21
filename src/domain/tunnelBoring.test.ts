import { beforeEach, describe, expect, it } from "vitest";
import { activateLayout, getActiveLayout, isWalkable, layoutFromAscii } from "./maze";
import {
  applyTunnelBoringAscii,
  openBoredCellsOnLayout,
  spendTunnelBoringCharge,
  TUNNEL_BORING_CHARGES_PER_LEVEL,
  tunnelBoringTarget,
} from "./tunnelBoring";

describe("tunnelBoringTarget", () => {
  beforeEach(() => {
    activateLayout("mazeSmall");
  });

  it("returns the adjacent solid cell when pressing into a wall", () => {
    const layout = getActiveLayout();
    let found: { col: number; row: number; dx: number; dy: number } | null = null;
    for (let row = 0; row < layout.rows && found === null; row += 1) {
      for (let col = 0; col < layout.cols && found === null; col += 1) {
        if (!isWalkable(col, row, layout.playerSolids)) {
          continue;
        }
        if (!isWalkable(col + 1, row, layout.playerSolids)) {
          found = { col, row, dx: 1, dy: 0 };
        }
      }
    }
    expect(found).not.toBeNull();
    const target = tunnelBoringTarget(found!.col, found!.row, found!.dx, found!.dy, layout);
    expect(target).toEqual({ col: found!.col + found!.dx, row: found!.row + found!.dy });
  });

  it("rejects already-open cells and zero steps", () => {
    const layout = getActiveLayout();
    const spawn = layout.playerSpawn;
    expect(tunnelBoringTarget(spawn.col, spawn.row, 0, 0, layout)).toBeNull();
    expect(tunnelBoringTarget(spawn.col, spawn.row, 1, 0, layout)).toBeNull();
  });

  it("rejects ghost-house neighbors", () => {
    const layout = getActiveLayout();
    const exit = layout.ghostHouseExit;
    const from = { col: exit.col, row: exit.row + 1 };
    if (isWalkable(from.col, from.row, layout.playerSolids)) {
      expect(tunnelBoringTarget(from.col, from.row, 0, -1, layout)).toBeNull();
    }
    expect(tunnelBoringTarget(exit.col, exit.row, 0, 0, layout)).toBeNull();
  });

  it("allows edge walls outside the ghost house", () => {
    const layout = getActiveLayout();
    let found: { col: number; row: number } | null = null;
    for (let col = 1; col < layout.cols - 1 && found === null; col += 1) {
      if (isWalkable(col, 1, layout.playerSolids) && !isWalkable(col, 0, layout.playerSolids)) {
        const target = tunnelBoringTarget(col, 1, 0, -1, layout);
        if (target !== null) {
          found = { col, row: 1 };
        }
      }
    }
    expect(found).not.toBeNull();
    expect(tunnelBoringTarget(found!.col, found!.row, 0, -1, layout)).toEqual({
      col: found!.col,
      row: 0,
    });
  });
});

describe("applyTunnelBoringAscii / openBoredCellsOnLayout", () => {
  it("turns wall chars into empty corridors", () => {
    const ascii = ["####", "#--#", "####"].join("\n");
    const next = applyTunnelBoringAscii(ascii, [{ col: 1, row: 0 }]);
    expect(next.split("\n")[0]).toBe("#-##");
  });

  it("keeps edge bored cells open after opposite-edge safety", () => {
    activateLayout("mazeSmall");
    const layout = getActiveLayout();
    let cell: { col: number; row: number } | null = null;
    for (let col = 1; col < layout.cols - 1; col += 1) {
      if (layout.walls[0]?.[col] && tunnelBoringTarget(col, 1, 0, -1, layout) !== null) {
        cell = { col, row: 0 };
        break;
      }
    }
    expect(cell).not.toBeNull();
    const boredAscii = applyTunnelBoringAscii(layout.ascii, [cell!]);
    const rebuilt = layoutFromAscii(boredAscii, "generated");
    openBoredCellsOnLayout(rebuilt, [cell!]);
    expect(isWalkable(cell!.col, cell!.row, rebuilt.playerSolids)).toBe(true);
    expect(isWalkable(cell!.col, cell!.row, rebuilt.ghostSolids)).toBe(true);
  });
});

describe("tunnel boring charges", () => {
  it("spends one charge and refills to the per-level cap", () => {
    expect(TUNNEL_BORING_CHARGES_PER_LEVEL).toBe(1);
    expect(spendTunnelBoringCharge(1)).toBe(0);
    expect(spendTunnelBoringCharge(0)).toBe(0);
  });
});
