import { describe, expect, it } from "vitest";
import { parseBonusParam } from "./bonusFlag";

describe("parseBonusParam", () => {
  it("parses a charge below the bar max", () => {
    expect(parseBonusParam(new URLSearchParams("bonus=0"))).toBe(0);
    expect(parseBonusParam(new URLSearchParams("bonus=299"))).toBe(299);
  });

  it("returns null for missing, full or invalid values", () => {
    expect(parseBonusParam(new URLSearchParams())).toBeNull();
    expect(parseBonusParam(new URLSearchParams("bonus=300"))).toBeNull();
    expect(parseBonusParam(new URLSearchParams("bonus=-1"))).toBeNull();
    expect(parseBonusParam(new URLSearchParams("bonus=x"))).toBeNull();
  });
});
