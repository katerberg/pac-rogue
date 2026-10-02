import { describe, expect, it } from "vitest";
import { parseKnobsFlag } from "./knobsFlag";

describe("parseKnobsFlag", () => {
  it("only accepts knobs=1", () => {
    expect(parseKnobsFlag(new URLSearchParams("knobs=1"))).toBe(true);
    expect(parseKnobsFlag(new URLSearchParams("knobs=0"))).toBe(false);
    expect(parseKnobsFlag(new URLSearchParams())).toBe(false);
  });
});
