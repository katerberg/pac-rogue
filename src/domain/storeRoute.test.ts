import { describe, expect, it } from "vitest";
import { storeExitCellAt, storeRouteStep } from "./storeRoute";

const grid = (ascii: string) => ascii.split("\n").map((line) => [...line].map((ch) => ch === "#"));

const ROOM = grid(`##.##
#...#
#.#.#
#...#
#####`);

describe("storeExitCellAt", () => {
  it("accepts an open border cell", () => {
    expect(storeExitCellAt(ROOM, 2, 0)).toEqual({ col: 2, row: 0 });
  });

  it("accepts a click just outside a tunnel mouth", () => {
    expect(storeExitCellAt(ROOM, 2, -1)).toEqual({ col: 2, row: 0 });
  });

  it("rejects interior cells, walls and far-away clicks", () => {
    expect(storeExitCellAt(ROOM, 1, 1)).toBeNull();
    expect(storeExitCellAt(ROOM, 1, 0)).toBeNull();
    expect(storeExitCellAt(ROOM, 2, -2)).toBeNull();
  });
});

describe("storeRouteStep", () => {
  it("steps along the shortest path", () => {
    expect(storeRouteStep(ROOM, { col: 1, row: 3 }, { col: 2, row: 0 }, () => false)).toEqual({
      dx: 0,
      dy: -1,
    });
    expect(storeRouteStep(ROOM, { col: 3, row: 3 }, { col: 2, row: 0 }, () => false)).toEqual({
      dx: 0,
      dy: -1,
    });
  });

  it("detours around avoided cells when it can", () => {
    const avoid = (col: number, row: number) => col === 1 && row === 2;
    expect(storeRouteStep(ROOM, { col: 1, row: 3 }, { col: 2, row: 0 }, avoid)).toEqual({
      dx: 1,
      dy: 0,
    });
  });

  it("walks through avoided cells when there is no other way", () => {
    const avoid = (_col: number, row: number) => row === 2;
    expect(storeRouteStep(ROOM, { col: 1, row: 3 }, { col: 2, row: 0 }, avoid)).toEqual({
      dx: 0,
      dy: -1,
    });
  });

  it("returns null when the target is unreachable", () => {
    const sealed = grid(`##.##
#####
#...#`);
    expect(storeRouteStep(sealed, { col: 1, row: 2 }, { col: 2, row: 0 }, () => false)).toBeNull();
  });
});
