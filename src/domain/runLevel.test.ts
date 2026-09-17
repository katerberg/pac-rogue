import { describe, expect, it } from "vitest";
import { ghostSpeedLevelMul, parseLevelParam } from "./runLevel";

describe("parseLevelParam", () => {
  it("parses positive integers", () => {
    expect(parseLevelParam(new URLSearchParams("level=1"))).toBe(1);
    expect(parseLevelParam(new URLSearchParams("level=3"))).toBe(3);
  });

  it("rejects missing invalid and zero", () => {
    expect(parseLevelParam(new URLSearchParams())).toBeNull();
    expect(parseLevelParam(new URLSearchParams("level="))).toBeNull();
    expect(parseLevelParam(new URLSearchParams("level=0"))).toBeNull();
    expect(parseLevelParam(new URLSearchParams("level=-1"))).toBeNull();
    expect(parseLevelParam(new URLSearchParams("level=1.5"))).toBeNull();
    expect(parseLevelParam(new URLSearchParams("level=nope"))).toBeNull();
  });
});

describe("ghostSpeedLevelMul", () => {
  it("scales linearly by 10% per level after the first", () => {
    expect(ghostSpeedLevelMul(1)).toBe(1);
    expect(ghostSpeedLevelMul(2)).toBe(1.1);
    expect(ghostSpeedLevelMul(3)).toBe(1.2);
  });

  it("clamps below 1 to level 1 mul", () => {
    expect(ghostSpeedLevelMul(0)).toBe(1);
    expect(ghostSpeedLevelMul(-2)).toBe(1);
  });
});
