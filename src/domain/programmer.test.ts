import { describe, expect, it } from "vitest";
import { getActiveLayout, type SolidGrid } from "./maze";
import {
  PROGRAMMER_PRESSES,
  isIntersection,
  programmerArrowPoints,
  programmerEnterCell,
  programmerQueueSlots,
  recordProgrammerPress,
  startProgrammer,
  type ProgramDir,
  type ProgrammerState,
} from "./programmer";

// A plus sign: row 5 open from col 2 to 8, col 5 open from row 2 to 8, an
// L-corner at (8, 5) turning up into (8, 4), and a T at (6, 5) branching down.
function plusSolids(): SolidGrid {
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

const SOLIDS = plusSolids();

function running(heading: ProgramDir, program: ProgramDir[], setsLeft = 0): ProgrammerState {
  return { phase: "running", program, heading, setsLeft };
}

function record(presses: ProgramDir[], sets = 1, col = 5, row = 5) {
  let step = {
    state: startProgrammer(sets) as ProgrammerState | null,
    heading: null as ProgramDir | null,
  };
  for (const dir of presses) {
    step = recordProgrammerPress(step.state!, dir, SOLIDS, col, row);
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
    expect(five.state).toEqual(running("right", ["up", "left", "down", "up"]));
    expect(five.heading).toBe("right");
    expect(PROGRAMMER_PRESSES).toBe(5);
  });

  it("uses up blocked presses at the start, and ends when none fit", () => {
    const skipped = record(["up", "down", "right", "left", "left"], 1, 3, 5);
    expect(skipped.state).toEqual(running("right", ["left", "left"]));
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
    expect(programmerEnterCell(state, SOLIDS, 3, 5)).toEqual({ state, heading: "right" });
  });

  it("takes the next press at an intersection", () => {
    expect(programmerEnterCell(running("right", ["up", "left"]), SOLIDS, 5, 5)).toEqual({
      state: running("up", ["left"]),
      heading: "up",
    });
  });

  it("allows a U-turn at an intersection", () => {
    expect(programmerEnterCell(running("right", ["left"]), SOLIDS, 5, 5).heading).toBe("left");
  });

  it("uses up a blocked press and keeps going straight", () => {
    expect(programmerEnterCell(running("right", ["up", "down"]), SOLIDS, 6, 5)).toEqual({
      state: running("right", ["down"]),
      heading: "right",
    });
  });

  it("ends the run at a corner whose press is blocked", () => {
    expect(programmerEnterCell(running("right", ["down", "up"]), SOLIDS, 8, 5)).toEqual({
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

describe("programmer queue look", () => {
  it("centers five slots above the player and fills them in press order", () => {
    const slots = programmerQueueSlots(["up", "left"], 100, 100, 20);
    expect(slots.map((slot) => slot.dir)).toEqual(["up", "left", null, null, null]);
    expect(slots[2]!.x).toBe(100);
    expect(slots[0]!.x).toBeLessThan(slots[4]!.x);
    expect(slots.every((slot) => slot.y < 100)).toBe(true);
  });

  it("points each arrow's tip the way it was pressed", () => {
    const [tip] = programmerArrowPoints({ x: 50, y: 50, dir: "right" }, 20);
    expect(tip!.x).toBeGreaterThan(50);
    expect(tip!.y).toBe(50);
    const [up] = programmerArrowPoints({ x: 50, y: 50, dir: "up" }, 20);
    expect(up!.y).toBeLessThan(50);
  });
});
