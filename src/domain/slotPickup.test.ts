import { describe, expect, it } from "vitest";
import { activateLayout, getActiveLayout, isWalkable } from "./maze";
import {
  pickSlotPickupCell,
  remapSlotPickupCell,
  SLOT_PICKUP_QUARTERS,
  tickSlotPickupProgress,
} from "./slotPickup";

describe("tickSlotPickupProgress", () => {
  it("spawns once every four Quarters and keeps the remainder", () => {
    expect(tickSlotPickupProgress(0, 3)).toEqual({ progress: 3, spawns: 0 });
    expect(tickSlotPickupProgress(3, 1)).toEqual({ progress: 0, spawns: 1 });
    expect(tickSlotPickupProgress(0, 8)).toEqual({ progress: 0, spawns: 2 });
    expect(tickSlotPickupProgress(2, 5)).toEqual({ progress: 3, spawns: 1 });
  });

  it("ignores non-positive gains", () => {
    expect(tickSlotPickupProgress(2, 0)).toEqual({ progress: 2, spawns: 0 });
    expect(tickSlotPickupProgress(2, -1)).toEqual({ progress: 2, spawns: 0 });
  });

  it("uses the shared threshold constant", () => {
    expect(SLOT_PICKUP_QUARTERS).toBe(4);
  });
});

describe("remapSlotPickupCell", () => {
  it("keeps a walkable cell and snaps a solid one to the nearest walkable", () => {
    activateLayout("mazeSmall");
    const solids = getActiveLayout().playerSolids;
    const walkable = { col: 10, row: 1 };
    expect(isWalkable(walkable.col, walkable.row, solids)).toBe(true);
    expect(remapSlotPickupCell(walkable.col, walkable.row, solids)).toEqual(walkable);

    let wallCol = -1;
    let wallRow = -1;
    for (let row = 0; row < solids.length && wallCol < 0; row += 1) {
      for (let col = 0; col < (solids[row]?.length ?? 0); col += 1) {
        if (!isWalkable(col, row, solids)) {
          wallCol = col;
          wallRow = row;
          break;
        }
      }
    }
    expect(wallCol).toBeGreaterThanOrEqual(0);
    const remapped = remapSlotPickupCell(wallCol, wallRow, solids);
    expect(isWalkable(remapped.col, remapped.row, solids)).toBe(true);
  });
});

describe("pickSlotPickupCell", () => {
  it("prefers walkable cells that are not the player spawn", () => {
    activateLayout("mazeSmall");
    const spawn = getActiveLayout().playerSpawn;
    const cell = pickSlotPickupCell(() => 0);
    expect(isWalkable(cell.col, cell.row)).toBe(true);
    expect(cell).not.toEqual({ col: spawn.col, row: spawn.row });
  });

  it("honors extra avoid cells when another walkable tile exists", () => {
    activateLayout("mazeSmall");
    const first = pickSlotPickupCell(() => 0);
    const second = pickSlotPickupCell(() => 0, undefined, [first]);
    expect(second).not.toEqual(first);
  });
});
