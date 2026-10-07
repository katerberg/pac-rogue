import { describe, expect, it } from "vitest";
import {
  DOTMAN_REVERSE_MS,
  DOTMAN_TURN_MS,
  restingTurn,
  turnAngle,
  turnToward,
} from "./dotManTurn";

describe("Dot-Man turns", () => {
  it("rests at the facing's angle, clockwise from right", () => {
    expect(turnAngle(restingTurn("right"), 0)).toBe(0);
    expect(turnAngle(restingTurn("down"), 0)).toBe(90);
    expect(turnAngle(restingTurn("left"), 0)).toBe(180);
    expect(turnAngle(restingTurn("up"), 0)).toBe(270);
  });

  it("keeps the same turn when the facing does not change", () => {
    const rest = restingTurn("left");
    expect(turnToward(rest, "left", 500)).toBe(rest);
  });

  it("rotates a quarter turn the short way, easing out", () => {
    const up = turnToward(restingTurn("right"), "up", 1000);
    expect(up).toMatchObject({ fromDeg: 0, toDeg: -90, durationMs: DOTMAN_TURN_MS });
    expect(turnAngle(up, 1000)).toBe(0);
    expect(turnAngle(up, 1000 + DOTMAN_TURN_MS / 2)).toBeCloseTo(-67.5);
    expect(turnAngle(up, 1000 + DOTMAN_TURN_MS)).toBe(-90);
    expect(turnAngle(up, 5000)).toBe(-90);

    const down = turnToward(restingTurn("up"), "down", 0);
    expect(down.durationMs).toBe(DOTMAN_REVERSE_MS);
  });

  it("reverses 180 degrees clockwise, faster than a quarter turn", () => {
    const reverse = turnToward(restingTurn("right"), "left", 0);
    expect(reverse).toMatchObject({ fromDeg: 0, toDeg: 180, durationMs: DOTMAN_REVERSE_MS });
    expect(DOTMAN_REVERSE_MS).toBeLessThan(DOTMAN_TURN_MS);
  });

  it("retargets mid-turn from the angle shown now", () => {
    const up = turnToward(restingTurn("right"), "up", 0);
    const midway = turnAngle(up, DOTMAN_TURN_MS / 2);
    const back = turnToward(up, "right", DOTMAN_TURN_MS / 2);
    expect(back.fromDeg).toBeCloseTo(midway);
    expect(back.toDeg).toBeCloseTo(0);
    expect(back.durationMs).toBeCloseTo((DOTMAN_TURN_MS * -midway) / 90);
  });
});
