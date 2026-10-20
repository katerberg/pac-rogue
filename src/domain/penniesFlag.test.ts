import { describe, expect, it } from "vitest";
import { parsePenniesParam } from "./penniesFlag";

describe("parsePenniesParam", () => {
  it("parses a charge below the bar max", () => {
    expect(parsePenniesParam(new URLSearchParams("pennyCharge=0"))).toBe(0);
    expect(parsePenniesParam(new URLSearchParams("pennyCharge=299"))).toBe(299);
  });

  it("returns null for missing, full or invalid values", () => {
    expect(parsePenniesParam(new URLSearchParams())).toBeNull();
    expect(parsePenniesParam(new URLSearchParams("pennyCharge=300"))).toBeNull();
    expect(parsePenniesParam(new URLSearchParams("pennyCharge=-1"))).toBeNull();
    expect(parsePenniesParam(new URLSearchParams("pennyCharge=x"))).toBeNull();
  });
});
