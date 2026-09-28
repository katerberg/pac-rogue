import { describe, expect, it } from "vitest";
import { glyphInkCenterOffsetX } from "./font8x8Basic";

describe("glyphInkCenterOffsetX", () => {
  it("measures how far a glyph's ink sits left of its 8px cell center", () => {
    expect(glyphInkCenterOffsetX("S")).toBe(1);
    expect(glyphInkCenterOffsetX("W")).toBe(0.5);
    expect(glyphInkCenterOffsetX(" ")).toBe(0);
  });
});
