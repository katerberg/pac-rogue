import { describe, expect, it } from "vitest";
import { DIRECTION } from "../components/Input";
import {
  emptyPlayerPelletFrame,
  HYPERSPEED_MAX_SUBSTEPS,
  hyperspeedSubstepCount,
  mergePlayerPelletFrames,
  noteHyperspeedFacing,
} from "./hyperspeed";

describe("hyperspeedSubstepCount", () => {
  it("splits a frame so no sub-step covers more than a quarter tile", () => {
    expect(hyperspeedSubstepCount(0, 16)).toBe(1);
    expect(hyperspeedSubstepCount(4, 16)).toBe(1);
    expect(hyperspeedSubstepCount(20.5, 16)).toBe(6);
  });

  it("caps the count", () => {
    expect(hyperspeedSubstepCount(1e9, 16)).toBe(HYPERSPEED_MAX_SUBSTEPS);
  });
});

describe("noteHyperspeedFacing", () => {
  it("does not count the first direction as a turn", () => {
    expect(noteHyperspeedFacing(null, DIRECTION.left, false)).toEqual({
      lastDirection: DIRECTION.left,
      turned: false,
    });
  });

  it("keeps going straight and ignores a blocked (none) facing", () => {
    expect(noteHyperspeedFacing(DIRECTION.left, DIRECTION.left, false).turned).toBe(false);
    expect(noteHyperspeedFacing(DIRECTION.left, DIRECTION.none, false)).toEqual({
      lastDirection: DIRECTION.left,
      turned: false,
    });
  });

  it("counts a perpendicular turn, a reversal, and a turn after a wall stop", () => {
    expect(noteHyperspeedFacing(DIRECTION.left, DIRECTION.up, false).turned).toBe(true);
    expect(noteHyperspeedFacing(DIRECTION.left, DIRECTION.right, false).turned).toBe(true);
  });

  it("absorbs facing changes made while the delay is running", () => {
    expect(noteHyperspeedFacing(DIRECTION.left, DIRECTION.down, true)).toEqual({
      lastDirection: DIRECTION.down,
      turned: false,
    });
  });
});

describe("mergePlayerPelletFrames", () => {
  it("concatenates removals and sums power pellets", () => {
    const a = { ...emptyPlayerPelletFrame(), powerRemoved: 1, removedEids: [1, 2] };
    const b = { ...emptyPlayerPelletFrame(), powerRemoved: 2, removedEids: [3] };
    const merged = mergePlayerPelletFrames(a, b);
    expect(merged.powerRemoved).toBe(3);
    expect(merged.removedEids).toEqual([1, 2, 3]);
  });
});
