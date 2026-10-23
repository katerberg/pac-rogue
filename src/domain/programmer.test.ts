import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, getActiveLayout, type SolidGrid } from "./maze";
import {
  PROGRAMMER_PRESSES,
  isIntersection,
  programmerArrowPoints,
  programmerEnterCell,
  programmerPathMarks,
  programmerQueueSlots,
  recordProgrammerPress,
  startProgrammer,
  type ProgramDir,
  type ProgrammerRunning,
  type ProgrammerStep,
} from "./programmer";

function plusWithCornerAndTee(): SolidGrid {
  const { rows, cols } = getActiveLayout();
  const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));
  for (let i = 2; i <= 8; i += 1) {
    grid[5]![i] = false;
    grid[i]![5] = false;
  }
  grid[4]![8] = false;
  grid[6]![6] = false;
  return grid;
}

const SOLIDS = plusWithCornerAndTee();

function running(
  heading: ProgramDir,
  program: ProgramDir[],
  setsLeft = 0,
  col = 0,
  row = 0,
): ProgrammerRunning {
  return { phase: "running", program, heading, setsLeft, col, row };
}

function record(presses: ProgramDir[], sets = 1, col = 5, row = 5) {
  let step: ProgrammerStep = { state: startProgrammer(sets), heading: null };
  for (const dir of presses) {
    if (step.state?.phase === "recording") {
      step = recordProgrammerPress(step.state, dir, SOLIDS, col, row);
    }
  }
  return step;
}

describe("isIntersection", () => {
  it("is any cell where a 90° turn is open, corners included", () => {
    expect(isIntersection(SOLIDS, 5, 5, "right")).toBe(true);
    expect(isIntersection(SOLIDS, 3, 5, "right")).toBe(false);
    expect(isIntersection(SOLIDS, 8, 5, "right")).toBe(true);
    expect(isIntersection(SOLIDS, 5, 3, "up")).toBe(false);
  });
});

describe("recordProgrammerPress", () => {
  it("collects presses until the fifth, then runs the first as the heading", () => {
    const four = record(["right", "up", "left", "down"]);
    expect(four.state).toEqual({
      phase: "recording",
      presses: ["right", "up", "left", "down"],
      setsLeft: 0,
    });
    expect(four.heading).toBeNull();
    const five = record(["right", "up", "left", "down", "up"]);
    expect(five.state).toEqual(running("right", ["up", "left", "down", "up"], 0, 5, 5));
    expect(five.heading).toBe("right");
    expect(PROGRAMMER_PRESSES).toBe(5);
  });

  it("uses up blocked presses at the start, and ends when none fit", () => {
    const skipped = record(["up", "down", "right", "left", "left"], 1, 3, 5);
    expect(skipped.state).toEqual(running("right", ["left", "left"], 0, 3, 5));
    const none = record(["up", "up", "down", "down", "up"], 1, 3, 5);
    expect(none).toEqual({ state: null, heading: null });
  });

  it("enhanced: a set that ends starts recording the next one", () => {
    expect(startProgrammer(2)).toEqual({ phase: "recording", presses: [], setsLeft: 1 });
    const none = record(["up", "up", "down", "down", "up"], 2, 3, 5);
    expect(none.state).toEqual({ phase: "recording", presses: [], setsLeft: 0 });
  });
});

describe("programmerEnterCell", () => {
  it("keeps going straight between intersections", () => {
    const state = running("right", ["up"]);
    expect(programmerEnterCell(state, SOLIDS, 3, 5)).toEqual({
      state: running("right", ["up"], 0, 3, 5),
      heading: "right",
    });
  });

  it("decides each tile once", () => {
    const state = running("right", ["up"], 0, 5, 5);
    expect(programmerEnterCell(state, SOLIDS, 5, 5)).toEqual({ state, heading: null });
  });

  it("takes the next press at an intersection", () => {
    expect(programmerEnterCell(running("right", ["up", "left"]), SOLIDS, 5, 5)).toEqual({
      state: running("up", ["left"], 0, 5, 5),
      heading: "up",
    });
  });

  it("allows a U-turn at an intersection", () => {
    expect(programmerEnterCell(running("right", ["left"]), SOLIDS, 5, 5).heading).toBe("left");
  });

  it("skips a blocked press and takes the next one at the same intersection", () => {
    expect(programmerEnterCell(running("right", ["up", "down", "left"]), SOLIDS, 6, 5)).toEqual({
      state: running("down", ["left"], 0, 6, 5),
      heading: "down",
    });
    expect(programmerEnterCell(running("right", ["down", "up"]), SOLIDS, 8, 5)).toEqual({
      state: running("up", [], 0, 8, 5),
      heading: "up",
    });
  });

  it("when every remaining press is blocked, ends the run heading straight if it can", () => {
    expect(programmerEnterCell(running("right", ["up", "up"]), SOLIDS, 6, 5)).toEqual({
      state: null,
      heading: "right",
    });
    expect(programmerEnterCell(running("right", ["down"]), SOLIDS, 8, 5)).toEqual({
      state: null,
      heading: null,
    });
  });

  it("ends the run at the intersection after the last press, still heading straight", () => {
    expect(programmerEnterCell(running("right", []), SOLIDS, 5, 5)).toEqual({
      state: null,
      heading: "right",
    });
  });

  it("ends the run at a dead end", () => {
    expect(programmerEnterCell(running("up", ["left"]), SOLIDS, 5, 2)).toEqual({
      state: null,
      heading: null,
    });
  });

  it("enhanced: the end of the first set starts recording the second", () => {
    expect(programmerEnterCell(running("right", [], 1), SOLIDS, 5, 5).state).toEqual({
      phase: "recording",
      presses: [],
      setsLeft: 0,
    });
  });
});

describe("programmerPathMarks", () => {
  const at = (col: number, row: number) => ({ x: cellCenterX(col), y: cellCenterY(row) });

  it("places each press at the tile where the run would take it, the newest marked latest", () => {
    expect(programmerPathMarks(["right", "up"], SOLIDS, 3, 5)).toEqual([
      { ...at(3, 5), dir: "right", latest: false },
      { ...at(5, 5), dir: "up", latest: true },
    ]);
    expect(programmerPathMarks(["right", "right", "down"], SOLIDS, 3, 5)).toEqual([
      { ...at(3, 5), dir: "right", latest: false },
      { ...at(5, 5), dir: "right", latest: false },
      { ...at(6, 5), dir: "down", latest: true },
    ]);
  });

  it("drops presses the run would skip and stops where it would end", () => {
    expect(programmerPathMarks(["up", "right", "down"], SOLIDS, 3, 5)).toEqual([
      { ...at(3, 5), dir: "right", latest: false },
      { ...at(5, 5), dir: "down", latest: true },
    ]);
    expect(programmerPathMarks(["up", "left"], SOLIDS, 5, 4)).toEqual([
      { ...at(5, 4), dir: "up", latest: false },
    ]);
    expect(programmerPathMarks([], SOLIDS, 3, 5)).toEqual([]);
  });
});

describe("programmer queue look", () => {
  it("centers five slots above the player and fills them in press order", () => {
    const slots = programmerQueueSlots(["up", "left"], 100, 100, 20);
    expect(slots.map((slot) => slot.dir)).toEqual(["up", "left", null, null, null]);
    expect(slots[2]!.x).toBe(100);
    expect(slots[0]!.x).toBeLessThan(slots[4]!.x);
    expect(slots.every((slot) => slot.y < 100)).toBe(true);
  });

  it("points each arrow's tip the way it was pressed", () => {
    const [tip] = programmerArrowPoints(50, 50, "right", 6);
    expect(tip!.x).toBeGreaterThan(50);
    expect(tip!.y).toBe(50);
    const [up] = programmerArrowPoints(50, 50, "up", 6);
    expect(up!.y).toBeLessThan(50);
  });
});
