import { describe, expect, it } from "vitest";
import {
  STREAK_POP_CAP_SIZE_MUL,
  STREAK_POP_RISE_PX,
  streakEngineFires,
  streakPopLook,
  streakPops,
} from "./streakEngine";

describe("streakEngineFires", () => {
  it("fires once per multiple of the interval crossed", () => {
    expect(streakEngineFires(38, 39, 40)).toBe(0);
    expect(streakEngineFires(39, 40, 40)).toBe(1);
    expect(streakEngineFires(40, 79, 40)).toBe(0);
    expect(streakEngineFires(79, 80, 40)).toBe(1);
    expect(streakEngineFires(30, 85, 40)).toBe(2);
  });
});

describe("streakPops", () => {
  it("pops each multiple of 5 on the pellet that completed it", () => {
    expect(streakPops(3, 5, 40)).toEqual([{ value: 5, cellIndex: 1 }]);
    expect(streakPops(3, 4, 40)).toEqual([]);
    expect(streakPops(4, 11, 40)).toEqual([
      { value: 5, cellIndex: 0 },
      { value: 10, cellIndex: 5 },
    ]);
  });

  it("cycles 5 through 40, then starts again at 5", () => {
    const values = streakPops(0, 85, 40).map((pop) => pop.value);
    expect(values.slice(0, 8)).toEqual([5, 10, 15, 20, 25, 30, 35, 40]);
    expect(values.slice(8)).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 5]);
  });
});

describe("streakPopLook", () => {
  it("rises and fades out, holding full opacity for the first half", () => {
    expect(streakPopLook(0, 5, 40)).toMatchObject({ alpha: 1 });
    expect(streakPopLook(0.5, 5, 40).alpha).toBe(1);
    expect(streakPopLook(1, 5, 40)).toMatchObject({ dy: -STREAK_POP_RISE_PX, alpha: 0 });
  });

  it("makes the closing 40 bigger", () => {
    expect(streakPopLook(0, 35, 40).sizeMul).toBe(1);
    expect(streakPopLook(0, 40, 40).sizeMul).toBe(STREAK_POP_CAP_SIZE_MUL);
  });
});
