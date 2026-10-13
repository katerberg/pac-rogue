import { describe, expect, it } from "vitest";
import { menuOptionLeftX, menuOptionText } from "./menuOptionLayout";

describe("menuOptionText", () => {
  it("prefixes a caret when selected and two spaces when idle", () => {
    expect(menuOptionText("START", true)).toBe("> START");
    expect(menuOptionText("START", false)).toBe("  START");
  });
});

describe("menuOptionLeftX", () => {
  it("keeps the label center fixed whether the caret or the idle spaces show", () => {
    const centerX = 400;
    const glyph = 8;
    const label = "START";
    const labelW = label.length * glyph;
    for (const selected of [true, false]) {
      const fullW = menuOptionText(label, selected).length * glyph;
      const left = menuOptionLeftX(centerX, fullW, labelW);
      expect(left + (fullW - labelW) + labelW / 2).toBeCloseTo(centerX);
    }
  });

  it("differs from centering the full prefixed string when prefix widths differ", () => {
    const centerX = 400;
    const labelW = 50;
    const selectedFull = 70;
    const idleFull = 60;
    const stableSelected = menuOptionLeftX(centerX, selectedFull, labelW);
    const naiveSelected = centerX - selectedFull / 2;
    const naiveIdle = centerX - idleFull / 2;

    expect(stableSelected).not.toBeCloseTo(naiveSelected);
    expect(naiveSelected).not.toBeCloseTo(naiveIdle);
  });

  it("puts the label start at centerX - labelWidth/2 for any hang", () => {
    const centerX = 400;
    const labelW = 80;
    for (const fullW of [80, 96, 112, 130]) {
      const left = menuOptionLeftX(centerX, fullW, labelW);
      expect(left + (fullW - labelW)).toBeCloseTo(centerX - labelW / 2);
    }
  });
});
