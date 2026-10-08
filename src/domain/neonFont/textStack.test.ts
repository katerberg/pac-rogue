import { describe, expect, it } from "vitest";
import { DEFAULT_TUNING } from "../tuning";
import { getUpgradeDef, type UpgradeId } from "../upgrades";
import { wrapText } from "../wrapText";
import { neonTextLocalHeight } from "./layout";
import {
  fitFontSizeFloor,
  interTextGap,
  lineWidthPx,
  stackRowsNonOverlapping,
  stackRowTops,
  stackRowTopsFromTop,
  wrapCharBudget,
  wrapCharsFittingWidth,
  wrapCharsForBox,
} from "./textStack";

describe("text stack layout", () => {
  it("keeps pixel wrap budgets and widens neon by 1.75×", () => {
    expect(wrapCharBudget(22, "pixel")).toBe(22);
    expect(wrapCharBudget(22, "neon")).toBe(39);
    expect(wrapCharBudget(8, "neon")).toBe(14);
  });

  it("scales inter-row gaps for neon only", () => {
    expect(interTextGap(8, "neon")).toBe(12);
    expect(interTextGap(16, "neon")).toBe(24);
    expect(interTextGap(16, "pixel")).toBe(16);
  });

  it("floors title fit at 16 and small text at 8", () => {
    expect(fitFontSizeFloor(32)).toBe(16);
    expect(fitFontSizeFloor(22)).toBe(16);
    expect(fitFontSizeFloor(16)).toBe(8);
    expect(fitFontSizeFloor(8)).toBe(8);
  });

  it("stacks school above body with style-aware gaps (store confirm geometry)", () => {
    const titleH = neonTextLocalHeight(2, 32, 0);
    const schoolH = 8;
    const bodyH = neonTextLocalHeight(4, 8, 0);
    const costH = 16;
    const schoolGap = interTextGap(8, "neon");
    const bodyGap = interTextGap(16, "neon");
    const costGap = interTextGap(16, "neon");
    const heights = [titleH, schoolH, bodyH, costH];
    const gaps = [schoolGap, bodyGap, costGap, 0];
    const tops = stackRowTops(heights, gaps, 0);
    expect(stackRowsNonOverlapping(heights, tops)).toBe(true);
    expect(tops[1]! + schoolH).toBeLessThanOrEqual(tops[2]!);
  });

  it("old store fixed bodyY=8 overlaps a tall neon title+school stack", () => {
    const titleH = neonTextLocalHeight(2, 32, 0);
    const schoolH = 8;
    const schoolGap = 8;
    const titleSchoolCenterY = -58;
    const tops = stackRowTops([titleH, schoolH], [schoolGap, 0], titleSchoolCenterY);
    const schoolBottom = tops[1]! + schoolH;
    const bodyH = neonTextLocalHeight(4, 8, 0);
    const bodyTop = 8 - bodyH / 2;
    expect(schoolBottom).toBeGreaterThan(bodyTop);
  });

  it("top-anchored panel stack keeps footer below body (no empty top band)", () => {
    const titleH = neonTextLocalHeight(2, 16, 0);
    const schoolH = 8;
    const bodyH = neonTextLocalHeight(3, 8, 0);
    const footerH = neonTextLocalHeight(2, 16, 0);
    const schoolGap = interTextGap(8, "neon");
    const sectionGap = interTextGap(16, "neon");
    const heights = [titleH, schoolH, bodyH, footerH];
    const gaps = [schoolGap, sectionGap, sectionGap, 0];
    const topY = -190 / 2 + 12;
    const tops = stackRowTopsFromTop(heights, gaps, topY);
    expect(stackRowsNonOverlapping(heights, tops)).toBe(true);
    expect(tops[0]).toBe(topY);
    expect(tops[2]! + bodyH).toBeLessThanOrEqual(tops[3]!);
  });
});

describe("store panel horizontal fit (neon)", () => {
  const PANEL_WIDTH = 168;
  const PANEL_SIDE_PAD = 24;
  const TITLE_SIZE = 16;
  const BODY_SIZE = 8;
  const thickness = DEFAULT_TUNING.fontThickness;
  const letterSpacing = DEFAULT_TUNING.fontLetterSpacing;
  const maxContent = PANEL_WIDTH - 2 * PANEL_SIDE_PAD;

  it.each(["passiveTunnelSanctuary", "passiveRemoteTransference"] as const)(
    "%s title and body stay inside side pads",
    (id) => {
      const def = getUpgradeDef(id as UpgradeId);
      const titleBudget = wrapCharsFittingWidth(
        def.label,
        PANEL_WIDTH,
        TITLE_SIZE,
        "neon",
        PANEL_SIDE_PAD,
        thickness,
        letterSpacing,
        wrapText,
      );
      const bodyBudget = wrapCharsFittingWidth(
        def.description,
        PANEL_WIDTH,
        BODY_SIZE,
        "neon",
        PANEL_SIDE_PAD,
        thickness,
        letterSpacing,
        wrapText,
      );
      for (const line of wrapText(def.label, titleBudget).split("\n")) {
        expect(lineWidthPx(line, TITLE_SIZE, "neon", thickness, letterSpacing)).toBeLessThanOrEqual(
          maxContent,
        );
      }
      for (const line of wrapText(def.description, bodyBudget).split("\n")) {
        expect(lineWidthPx(line, BODY_SIZE, "neon", thickness, letterSpacing)).toBeLessThanOrEqual(
          maxContent,
        );
      }
    },
  );

  it("wrapCharsForBox is an upper bound before advance fitting", () => {
    const fromBox = wrapCharsForBox(PANEL_WIDTH, BODY_SIZE, "neon", PANEL_SIDE_PAD);
    const fitted = wrapCharsFittingWidth(
      getUpgradeDef("passiveTunnelSanctuary").description,
      PANEL_WIDTH,
      BODY_SIZE,
      "neon",
      PANEL_SIDE_PAD,
      thickness,
      letterSpacing,
      wrapText,
    );
    expect(fitted).toBeLessThanOrEqual(fromBox);
  });
});
