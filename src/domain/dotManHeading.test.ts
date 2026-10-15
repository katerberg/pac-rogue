import { describe, expect, it } from "vitest";
import { DOTMAN_TURN_MS, headingAngle, stepHeading } from "./dotManHeading";

describe("headingAngle", () => {
  it("points the right-facing art along each cardinal", () => {
    expect(headingAngle("right")).toBe(0);
    expect(headingAngle("down")).toBeCloseTo(Math.PI / 2);
    expect(headingAngle("left")).toBeCloseTo(Math.PI);
    expect(headingAngle("up")).toBeCloseTo(-Math.PI / 2);
  });
});

describe("stepHeading", () => {
  it("takes one quarter turn in DOTMAN_TURN_MS", () => {
    const half = stepHeading(0, headingAngle("down"), DOTMAN_TURN_MS / 2);
    expect(half).toBeCloseTo(Math.PI / 4);
    expect(stepHeading(0, headingAngle("down"), DOTMAN_TURN_MS)).toBeCloseTo(Math.PI / 2);
  });

  it("settles exactly on the target without overshooting", () => {
    expect(stepHeading(0, headingAngle("down"), DOTMAN_TURN_MS * 10)).toBe(Math.PI / 2);
  });

  it("turns the short way round the seam", () => {
    const fromUp = stepHeading(headingAngle("up"), headingAngle("left"), DOTMAN_TURN_MS / 2);
    expect(fromUp).toBeLessThan(headingAngle("up"));
    const fromLeft = stepHeading(headingAngle("left"), headingAngle("up"), DOTMAN_TURN_MS / 2);
    expect(fromLeft).toBeGreaterThan(headingAngle("left"));
  });

  it("holds still with no elapsed time", () => {
    expect(stepHeading(1, 2, 0)).toBe(1);
  });
});
