import { afterEach, describe, expect, it } from "vitest";
import {
  HOUSE_SEAT_COUNT,
  assignHouseSeats,
  ghostHouseSeatCenters,
  houseSeatCount,
  nearestHouseSeatIndex,
  spreadSeatIndices,
} from "./ghostHouseSeats";
import {
  activateAsciiLayout,
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
} from "./maze";
import { tinyHouseMazeAscii } from "./mazeLayouts";

describe("ghostHouseSeats", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("derives four distinct left-to-right seats on both classic layouts", () => {
    for (const id of ["maze1", "maze2"] as const) {
      activateLayout(id);
      const seats = ghostHouseSeatCenters();
      expect(seats).toHaveLength(HOUSE_SEAT_COUNT);
      expect(houseSeatCount()).toBe(HOUSE_SEAT_COUNT);
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

  it("caps seats on mazeSmall's 4-wide house so sprites do not stack", () => {
    activateLayout("mazeSmall");
    expect(houseSeatCount()).toBe(3);
    const seats = ghostHouseSeatCenters();
    expect(seats).toHaveLength(3);
    expect(seats[0]!.x).toBeLessThan(seats[1]!.x);
    expect(seats[1]!.x).toBeLessThan(seats[2]!.x);
  });

  it("fits a single seat in a 2-wide house spawn row", () => {
    activateAsciiLayout(tinyHouseMazeAscii());
    expect(houseSeatCount()).toBe(1);
    const spawn = getActiveLayout().ghostHouseSpawn;
    const seats = ghostHouseSeatCenters();
    expect(seats).toHaveLength(1);
    expect(seats[0]!.x).toBe((cellCenterX(spawn.col) + cellCenterX(spawn.col + 1)) / 2);
    expect(seats[0]!.y).toBe(cellCenterY(spawn.row));
  });

  it("spreads fewer ghosts across the seat row instead of packing left", () => {
    expect(spreadSeatIndices(2, 4)).toEqual([0, 3]);
    expect(spreadSeatIndices(2, 3)).toEqual([0, 2]);
    expect(spreadSeatIndices(1, 4)).toEqual([1]);
    expect(spreadSeatIndices(3, 4)).toEqual([0, 2, 3]);
    expect(spreadSeatIndices(4, 4)).toEqual([0, 1, 2, 3]);
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

  it("spreads ghosts across seats when they share one seat at spawn", () => {
    activateLayout("maze1");
    const seats = ghostHouseSeatCenters();
    const center = {
      x: cellCenterX(getActiveLayout().ghostHouseSpawn.col),
      y: cellCenterY(getActiveLayout().ghostHouseSpawn.row),
    };
    const four = [
      { eid: 1, x: center.x, y: center.y },
      { eid: 2, x: center.x, y: center.y },
      { eid: 3, x: center.x, y: center.y },
      { eid: 4, x: center.x, y: center.y },
    ];
    const assignedFour = assignHouseSeats(four, [1, 2, 3, 4], seats);
    expect([...assignedFour.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
    ]);

    const two = [
      { eid: 1, x: center.x, y: center.y },
      { eid: 2, x: center.x, y: center.y },
    ];
    const assignedTwo = assignHouseSeats(two, [1, 2], seats);
    expect(assignedTwo.get(1)).toBe(0);
    expect(assignedTwo.get(2)).toBe(3);
    expect(nearestHouseSeatIndex(center.x, center.y, seats)).toBeGreaterThanOrEqual(0);
  });
});
