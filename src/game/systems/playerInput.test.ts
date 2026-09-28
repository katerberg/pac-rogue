import { describe, expect, it } from "vitest";
import { DIRECTION } from "../components/Input";
import { combineAxisDirections } from "./playerInput";

const none = { direction: DIRECTION.none, time: -1 };

describe("combineAxisDirections", () => {
  it("returns none when neither axis is held", () => {
    expect(combineAxisDirections(none, none, true)).toBe(DIRECTION.none);
    expect(combineAxisDirections(none, none, false)).toBe(DIRECTION.none);
  });

  it("returns the single held axis regardless of diagonalAllowed", () => {
    const up = { direction: DIRECTION.up, time: 10 };
    expect(combineAxisDirections(up, none, true)).toBe(DIRECTION.up);
    expect(combineAxisDirections(up, none, false)).toBe(DIRECTION.up);

    const left = { direction: DIRECTION.left, time: 10 };
    expect(combineAxisDirections(none, left, true)).toBe(DIRECTION.left);
    expect(combineAxisDirections(none, left, false)).toBe(DIRECTION.left);
  });

  it("combines both axes into a diagonal when allowed", () => {
    const up = { direction: DIRECTION.up, time: 5 };
    const left = { direction: DIRECTION.left, time: 10 };
    expect(combineAxisDirections(up, left, true)).toBe(DIRECTION.upLeft);

    const down = { direction: DIRECTION.down, time: 5 };
    const right = { direction: DIRECTION.right, time: 10 };
    expect(combineAxisDirections(down, right, true)).toBe(DIRECTION.downRight);
    expect(combineAxisDirections(up, right, true)).toBe(DIRECTION.upRight);
    expect(combineAxisDirections(down, left, true)).toBe(DIRECTION.downLeft);
  });

  it("falls back to the most-recently-pressed single axis when diagonal is not allowed", () => {
    const up = { direction: DIRECTION.up, time: 5 };
    const left = { direction: DIRECTION.left, time: 10 };
    expect(combineAxisDirections(up, left, false)).toBe(DIRECTION.left);

    const laterUp = { direction: DIRECTION.up, time: 15 };
    expect(combineAxisDirections(laterUp, left, false)).toBe(DIRECTION.up);
  });
});
