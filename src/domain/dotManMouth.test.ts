import { describe, expect, it } from "vitest";
import {
  advanceDotManChomp,
  DOTMAN_CHOMP_PIXELS_AT_1X,
  DOTMAN_CHOMP_PIXELS_PER_FRAME,
  DOTMAN_CHOMP_SPEED_DEFAULT,
  dotManChompPixelsPerFrame,
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
