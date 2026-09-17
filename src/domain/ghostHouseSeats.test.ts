import { afterEach, describe, expect, it } from "vitest";
import {
  HOUSE_SEAT_COUNT,
  assignHouseSeats,
  ghostHouseSeatCenters,
  nearestHouseSeatIndex,
} from "./ghostHouseSeats";
import { activateLayout, cellCenterX, cellCenterY, getActiveLayout } from "./maze";

describe("ghostHouseSeats", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("derives four distinct left-to-right seats on both layouts", () => {
    for (const id of ["maze1", "maze2"] as const) {
      activateLayout(id);
      const seats = ghostHouseSeatCenters();
      expect(seats).toHaveLength(HOUSE_SEAT_COUNT);
      expect(seats[0]!.x).toBeLessThan(seats[1]!.x);
      expect(seats[1]!.x).toBeLessThan(seats[2]!.x);
      expect(seats[2]!.x).toBeLessThan(seats[3]!.x);
      expect(seats[0]!.y).toBe(seats[1]!.y);
      expect(seats[1]!.y).toBe(seats[2]!.y);
      expect(seats[2]!.y).toBe(seats[3]!.y);
      const spawn = getActiveLayout().ghostHouseSpawn;
      expect(seats[0]!.y).toBe(cellCenterY(spawn.row));
      const gap01 = seats[1]!.x - seats[0]!.x;
      const gap12 = seats[2]!.x - seats[1]!.x;
      const gap23 = seats[3]!.x - seats[2]!.x;
      expect(gap01).toBeCloseTo(gap12);
      expect(gap12).toBeCloseTo(gap23);
    }
  });

  it("keeps seats sticky when L→R already matches predicted order", () => {
    activateLayout("maze1");
    const seats = ghostHouseSeatCenters();
    const ghosts = [
      { eid: 2, x: seats[1]!.x, y: seats[1]!.y },
      { eid: 3, x: seats[2]!.x, y: seats[2]!.y },
    ];
    const assigned = assignHouseSeats(ghosts, [2, 3], seats);
    expect(assigned.get(2)).toBe(1);
    expect(assigned.get(3)).toBe(2);
  });

  it("permutes within occupied seats when order swaps", () => {
    activateLayout("maze1");
    const seats = ghostHouseSeatCenters();
    const ghosts = [
      { eid: 2, x: seats[1]!.x, y: seats[1]!.y },
      { eid: 3, x: seats[2]!.x, y: seats[2]!.y },
    ];
    const assigned = assignHouseSeats(ghosts, [3, 2], seats);
    expect(assigned.get(3)).toBe(1);
    expect(assigned.get(2)).toBe(2);
  });

  it("fills leftmost seats when ghosts share one seat at spawn", () => {
    activateLayout("maze1");
    const seats = ghostHouseSeatCenters();
    const center = {
      x: cellCenterX(getActiveLayout().ghostHouseSpawn.col),
      y: cellCenterY(getActiveLayout().ghostHouseSpawn.row),
    };
    const ghosts = [
      { eid: 1, x: center.x, y: center.y },
      { eid: 2, x: center.x, y: center.y },
      { eid: 3, x: center.x, y: center.y },
      { eid: 4, x: center.x, y: center.y },
    ];
    const assigned = assignHouseSeats(ghosts, [1, 2, 3, 4], seats);
    expect([...assigned.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
    ]);
    expect(nearestHouseSeatIndex(center.x, center.y, seats)).toBeGreaterThanOrEqual(0);
  });
});
