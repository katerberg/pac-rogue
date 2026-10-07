import { describe, expect, it } from "vitest";
import { fontLineArtLook } from "./neonFont/fontLook";
import { neonLineAdvance } from "./neonFont/layout";
import { DEFAULT_TUNING } from "./tuning";
import { menuOptionLeftX, menuOptionText } from "./menuOptionLayout";

describe("menuOptionText", () => {
  it("prefixes a caret when selected and two spaces when idle", () => {
    expect(menuOptionText("START", true)).toBe("> START");
    expect(menuOptionText("START", false)).toBe("  START");
  });
});

describe("menuOptionLeftX", () => {
  it("keeps the label center fixed when the neon caret is wider than two spaces", () => {
    const look = fontLineArtLook(DEFAULT_TUNING);
    const { thickness, letterSpacing } = look;
    const centerX = 400;
    const label = "START";
    const labelW = neonLineAdvance(label, thickness, letterSpacing);
    const selectedFull = neonLineAdvance(menuOptionText(label, true), thickness, letterSpacing);
    const idleFull = neonLineAdvance(menuOptionText(label, false), thickness, letterSpacing);

    expect(selectedFull).toBeGreaterThan(idleFull);

    const selectedLeft = menuOptionLeftX(centerX, selectedFull, labelW);
    const idleLeft = menuOptionLeftX(centerX, idleFull, labelW);
    const selectedLabelStart = selectedLeft + (selectedFull - labelW);
    const idleLabelStart = idleLeft + (idleFull - labelW);

    expect(selectedLabelStart).toBeCloseTo(idleLabelStart);
    expect(selectedLabelStart + labelW / 2).toBeCloseTo(centerX);
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
