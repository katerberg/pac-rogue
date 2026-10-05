import { describe, expect, it } from "vitest";
import {
  STREAK_POP_CAP_SIZE_MUL,
  STREAK_POP_RISE_PX,
  streakEngineFires,
  streakPopLook,
  streakPops,
} from "./streakEngine";
import { STREAK_ENGINE_EVERY } from "./upgrades";

describe("streakEngineFires", () => {
  it("fires once per multiple of the interval crossed", () => {
    expect(streakEngineFires(28, 29, STREAK_ENGINE_EVERY)).toBe(0);
    expect(streakEngineFires(29, 30, STREAK_ENGINE_EVERY)).toBe(1);
    expect(streakEngineFires(30, 59, STREAK_ENGINE_EVERY)).toBe(0);
    expect(streakEngineFires(59, 60, STREAK_ENGINE_EVERY)).toBe(1);
    expect(streakEngineFires(20, 65, STREAK_ENGINE_EVERY)).toBe(2);
  });
});

describe("streakPops", () => {
  it("pops each multiple of 5 on the pellet that completed it", () => {
    expect(streakPops(3, 5, STREAK_ENGINE_EVERY)).toEqual([{ value: 5, cellIndex: 1 }]);
    expect(streakPops(3, 4, STREAK_ENGINE_EVERY)).toEqual([]);
    expect(streakPops(4, 11, STREAK_ENGINE_EVERY)).toEqual([
      { value: 5, cellIndex: 0 },
      { value: 10, cellIndex: 5 },
    ]);
  });

  it("cycles 5 through 30, then starts again at 5", () => {
    const values = streakPops(0, 65, STREAK_ENGINE_EVERY).map((pop) => pop.value);
    expect(values.slice(0, 6)).toEqual([5, 10, 15, 20, 25, 30]);
    expect(values.slice(6)).toEqual([5, 10, 15, 20, 25, 30, 5]);
  });
});

describe("streakPopLook", () => {
  it("rises and fades out, holding full opacity for the first half", () => {
    expect(streakPopLook(0, 5, STREAK_ENGINE_EVERY)).toMatchObject({ alpha: 1 });
    expect(streakPopLook(0.5, 5, STREAK_ENGINE_EVERY).alpha).toBe(1);
    expect(streakPopLook(1, 5, STREAK_ENGINE_EVERY)).toMatchObject({
      dy: -STREAK_POP_RISE_PX,
      alpha: 0,
    });
  });

  it("makes the closing 30 bigger", () => {
    expect(streakPopLook(0, 25, STREAK_ENGINE_EVERY).sizeMul).toBe(1);
    expect(streakPopLook(0, 30, STREAK_ENGINE_EVERY).sizeMul).toBe(STREAK_POP_CAP_SIZE_MUL);
  });
});
