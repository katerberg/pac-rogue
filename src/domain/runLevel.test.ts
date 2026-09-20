import { describe, expect, it } from "vitest";
import { parseLevelParam } from "./runLevel";

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
