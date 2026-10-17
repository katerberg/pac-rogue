import { describe, expect, it } from "vitest";
import {
  advanceDotManChomp,
  DOTMAN_CHOMP_PIXELS_AT_1X,
  DOTMAN_CHOMP_PIXELS_PER_FRAME,
  DOTMAN_CHOMP_SPEED_DEFAULT,
  dotManChompPixelsPerFrame,
  dotManVisorLift,
  DOTMAN_VISOR_BOB_ART_PX,
} from "./dotManMouth";

describe("dotManChompPixelsPerFrame", () => {
  it("defaults to 1.25× speed", () => {
    expect(DOTMAN_CHOMP_SPEED_DEFAULT).toBe(1.25);
    expect(DOTMAN_CHOMP_PIXELS_PER_FRAME).toBe(DOTMAN_CHOMP_PIXELS_AT_1X / 1.25);
    expect(dotManChompPixelsPerFrame(1)).toBe(DOTMAN_CHOMP_PIXELS_AT_1X);
    expect(dotManChompPixelsPerFrame(4)).toBe(DOTMAN_CHOMP_PIXELS_AT_1X / 4);
  });
});

describe("advanceDotManChomp", () => {
  it("advances one beat per travel distance and keeps leftover carry", () => {
    const stepped = advanceDotManChomp(
      { carry: 0, cycleIndex: 0 },
      DOTMAN_CHOMP_PIXELS_PER_FRAME + 3,
    );
    expect(stepped).toEqual({ carry: 3, cycleIndex: 1 });
    expect(advanceDotManChomp(stepped, DOTMAN_CHOMP_PIXELS_PER_FRAME * 3).cycleIndex).toBe(0);
  });
});

describe("dotManVisorLift", () => {
  const beat = DOTMAN_CHOMP_PIXELS_PER_FRAME;

  it("rests at the start of a cycle and peaks mid-cycle", () => {
    expect(dotManVisorLift({ carry: 0, cycleIndex: 0 }, beat)).toBe(0);
    expect(dotManVisorLift({ carry: 0, cycleIndex: 2 }, beat)).toBeCloseTo(DOTMAN_VISOR_BOB_ART_PX);
  });

  it("moves smoothly between beats instead of stepping", () => {
    const before = dotManVisorLift({ carry: 0, cycleIndex: 1 }, beat);
    const between = dotManVisorLift({ carry: beat / 2, cycleIndex: 1 }, beat);
    const after = dotManVisorLift({ carry: 0, cycleIndex: 2 }, beat);
    expect(between).toBeGreaterThan(before);
    expect(between).toBeLessThan(after);
  });
});
