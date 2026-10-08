import { describe, expect, it } from "vitest";
import { fitFontSize } from "../fitFontSize";
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
    // Short panel: school-sized gaps between every row (matches storeOverlay showPanel).
    const rowGap = interTextGap(8, "neon");
    const heights = [titleH, schoolH, bodyH, footerH];
    const gaps = [rowGap, rowGap, rowGap, 0];
    const panelH = 190;
    const topY = -panelH / 2 + 12;
    const tops = stackRowTopsFromTop(heights, gaps, topY);
    expect(stackRowsNonOverlapping(heights, tops)).toBe(true);
    expect(tops[0]).toBe(topY);
    expect(tops[2]! + bodyH).toBeLessThanOrEqual(tops[3]!);
    expect(tops[3]! + footerH).toBeLessThanOrEqual(panelH / 2);
  });
});

describe("store panel horizontal fit (neon)", () => {
  const PANEL_WIDTH = 168;
  const PANEL_SIDE_PAD = 34;
  const TITLE_SIZE = 16;
  const BODY_SIZE = 8;
  const thickness = DEFAULT_TUNING.fontThickness;
  const letterSpacing = DEFAULT_TUNING.fontLetterSpacing;
  const maxContent = PANEL_WIDTH - 2 * PANEL_SIDE_PAD;

  it.each(["passiveTunnelSanctuary", "passiveRemoteTransference"] as const)(
    "%s title and body stay inside side pads (display case)",
    (id) => {
      const def = getUpgradeDef(id as UpgradeId);
      const titleSize = fitFontSize(def.label, maxContent, TITLE_SIZE, "neon");
      const titleBudget = wrapCharsFittingWidth(
        def.label,
        PANEL_WIDTH,
        titleSize,
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
      // Fitting must account for NeonText uppercasing — mixed-case advance under-measures.
      for (const line of wrapText(def.label, titleBudget).split("\n")) {
        expect(lineWidthPx(line, titleSize, "neon", thickness, letterSpacing)).toBeLessThanOrEqual(
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

  it("mixed-case Tunnel Sanctuary body would overflow without display-case fitting", () => {
    const body = getUpgradeDef("passiveTunnelSanctuary").description;
    const naiveBudget = wrapCharsForBox(PANEL_WIDTH, BODY_SIZE, "neon", PANEL_SIDE_PAD);
    const naiveLines = wrapText(body, naiveBudget).split("\n");
    const naiveOverflows = naiveLines.some(
      (line) => lineWidthPx(line, BODY_SIZE, "neon", thickness, letterSpacing) > maxContent,
    );
    expect(naiveOverflows).toBe(true);
    const fitted = wrapCharsFittingWidth(
      body,
      PANEL_WIDTH,
      BODY_SIZE,
      "neon",
      PANEL_SIDE_PAD,
      thickness,
      letterSpacing,
      wrapText,
    );
    expect(fitted).toBeLessThan(naiveBudget);
  });

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
