import { describe, expect, it } from "vitest";
import { parseQuartersParam } from "./quartersFlag";

describe("parseQuartersParam", () => {
  it("parses non-negative integers", () => {
    expect(parseQuartersParam(new URLSearchParams("quarters=0"))).toBe(0);
    expect(parseQuartersParam(new URLSearchParams("quarters=1"))).toBe(1);
    expect(parseQuartersParam(new URLSearchParams("quarters=12"))).toBe(12);
  });

  it("returns null for missing or invalid values", () => {
    expect(parseQuartersParam(new URLSearchParams())).toBeNull();
    expect(parseQuartersParam(new URLSearchParams("quarters="))).toBeNull();
    expect(parseQuartersParam(new URLSearchParams("quarters=-1"))).toBeNull();
    expect(parseQuartersParam(new URLSearchParams("quarters=1.5"))).toBeNull();
    expect(parseQuartersParam(new URLSearchParams("quarters=nope"))).toBeNull();
  });
});
