import { describe, expect, it } from "vitest";
import {
  LEARN_UPGRADE_CLIP_BOTTOM,
  LEARN_UPGRADE_CLIP_TOP,
  LEARN_UPGRADE_COLUMN_X,
  LEARN_UPGRADE_HEADER_GAP,
  LEARN_UPGRADE_ROW_GAP,
  LEARN_UPGRADE_ROW_WIDTH,
  applyLearnUpgradeWheel,
  clampLearnUpgradeScroll,
  learnUpgradeColumnAtX,
  learnUpgradeContentHeight,
  learnUpgradeRowVisible,
  learnUpgradeScrollExtent,
  learnUpgradeViewportHeight,
} from "./learnUpgradeScroll";

describe("learnUpgradeContentHeight", () => {
  it("matches the LearnScene school/row recurrence", () => {
    expect(learnUpgradeContentHeight(3, 24)).toBe(
      3 * LEARN_UPGRADE_HEADER_GAP + 24 * LEARN_UPGRADE_ROW_GAP,
    );
    expect(learnUpgradeContentHeight(4, 24)).toBe(
      4 * LEARN_UPGRADE_HEADER_GAP + 24 * LEARN_UPGRADE_ROW_GAP,
    );
  });

  it("is zero for an empty column", () => {
    expect(learnUpgradeContentHeight(0, 0)).toBe(0);
  });
});

describe("learnUpgradeScrollExtent", () => {
  it("is zero when content fits the viewport", () => {
    const viewport = learnUpgradeViewportHeight();
    expect(learnUpgradeScrollExtent(viewport)).toBe(0);
    expect(learnUpgradeScrollExtent(viewport - 1)).toBe(0);
  });

  it("returns the overflow for the learnAll right column", () => {
    const content = learnUpgradeContentHeight(4, 24);
    const viewport = learnUpgradeViewportHeight();
    expect(content).toBeGreaterThan(viewport);
    expect(learnUpgradeScrollExtent(content)).toBe(content - viewport);
  });
});

describe("clampLearnUpgradeScroll / applyLearnUpgradeWheel", () => {
  it("stays at 0 when there is no overflow", () => {
    expect(clampLearnUpgradeScroll(40, 0)).toBe(0);
    expect(applyLearnUpgradeWheel(0, 120, 0)).toBe(0);
  });

  it("clamps to the extent", () => {
    expect(clampLearnUpgradeScroll(-10, 50)).toBe(0);
    expect(clampLearnUpgradeScroll(80, 50)).toBe(50);
    expect(applyLearnUpgradeWheel(40, 100, 50)).toBe(50);
    expect(applyLearnUpgradeWheel(10, -40, 50)).toBe(0);
  });

  it("wheel down increases offset", () => {
    expect(applyLearnUpgradeWheel(0, 16, 100)).toBe(16);
  });
});

describe("learnUpgradeColumnAtX", () => {
  it("hits each gutter and ignores the maze", () => {
    expect(learnUpgradeColumnAtX(LEARN_UPGRADE_COLUMN_X.left)).toBe("left");
    expect(learnUpgradeColumnAtX(LEARN_UPGRADE_COLUMN_X.left + LEARN_UPGRADE_ROW_WIDTH - 1)).toBe(
      "left",
    );
    expect(learnUpgradeColumnAtX(LEARN_UPGRADE_COLUMN_X.right)).toBe("right");
    expect(learnUpgradeColumnAtX(400)).toBeNull();
  });
});

describe("learnUpgradeRowVisible", () => {
  it("hides rows scrolled above the clip top", () => {
    expect(learnUpgradeRowVisible(104, 0)).toBe(true);
    expect(learnUpgradeRowVisible(104, 40)).toBe(false);
  });

  it("hides rows below the clip bottom", () => {
    const localY = LEARN_UPGRADE_CLIP_BOTTOM + 20;
    expect(learnUpgradeRowVisible(localY, 0)).toBe(false);
    expect(learnUpgradeRowVisible(localY, 40)).toBe(true);
  });

  it("keeps the first header in view at scroll 0", () => {
    const firstHeaderY = LEARN_UPGRADE_CLIP_TOP - LEARN_UPGRADE_ROW_GAP + LEARN_UPGRADE_HEADER_GAP;
    expect(firstHeaderY).toBe(104);
    expect(learnUpgradeRowVisible(firstHeaderY, 0)).toBe(true);
    expect(LEARN_UPGRADE_CLIP_TOP).toBeLessThan(firstHeaderY);
  });
});
