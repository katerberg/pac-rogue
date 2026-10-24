import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { activateLayout, cellCenterX, cellCenterY, TILE_SIZE } from "./maze";
import {
  pushSlimeTile,
  SLIME_TRAIL_MAX_LEN,
  slimeOwnerTouching,
  slimesInScope,
} from "./slimeTrail";

describe("slime trail", () => {
  it("adds a tile only when the ghost reaches a new one", () => {
    const one = pushSlimeTile([], { col: 1, row: 1 });
    expect(pushSlimeTile(one, { col: 1, row: 1 })).toBe(one);
    expect(pushSlimeTile(one, { col: 2, row: 1 })).toEqual([
      { col: 1, row: 1 },
      { col: 2, row: 1 },
    ]);
  });

  it("drops the oldest tile past the max length", () => {
    let trail = pushSlimeTile([], { col: 0, row: 1 });
    for (let col = 1; col <= SLIME_TRAIL_MAX_LEN; col += 1) {
      trail = pushSlimeTile(trail, { col, row: 1 });
    }
    expect(trail).toHaveLength(SLIME_TRAIL_MAX_LEN);
    expect(trail[0]).toEqual({ col: 1, row: 1 });
  });

  it("scopes slime to Blinky or every ghost", () => {
    expect(slimesInScope("none", GHOST_KIND.blinky)).toBe(false);
    expect(slimesInScope("blinky", GHOST_KIND.blinky)).toBe(true);
    expect(slimesInScope("blinky", GHOST_KIND.pinky)).toBe(false);
    expect(slimesInScope("all", GHOST_KIND.clyde)).toBe(true);
  });

  it("names the ghost whose slime the circle touches", () => {
    activateLayout("maze1");
    const trails = new Map([
      [7, [{ col: 1, row: 1 }]],
      [9, [{ col: 5, row: 5 }]],
    ]);
    expect(slimeOwnerTouching(trails, cellCenterX(5), cellCenterY(5), 4)).toBe(9);
    expect(slimeOwnerTouching(trails, cellCenterX(3), cellCenterY(3), 4)).toBeNull();
    expect(
      slimeOwnerTouching(trails, cellCenterX(1) + TILE_SIZE * 3, cellCenterY(1), 4),
    ).toBeNull();
  });
});
