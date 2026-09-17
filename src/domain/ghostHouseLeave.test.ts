import { describe, expect, it } from "vitest";
import { leavingHouseTarget } from "./ghostHouseLeave";
import { activateLayout, getActiveLayout } from "./maze";

describe("leavingHouseTarget", () => {
  it("targets the door column on the current row while misaligned", () => {
    activateLayout("maze1");
    const exit = getActiveLayout().ghostHouseExit;
    const spawnRow = getActiveLayout().ghostHouseSpawn.row;
    expect(leavingHouseTarget(exit.col - 2, spawnRow)).toEqual({
      col: exit.col,
      row: spawnRow,
    });
  });

  it("targets the house exit once on the door column", () => {
    activateLayout("maze1");
    const exit = getActiveLayout().ghostHouseExit;
    expect(leavingHouseTarget(exit.col, getActiveLayout().ghostHouseSpawn.row)).toEqual(exit);
  });
});
