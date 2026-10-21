import { describe, expect, it } from "vitest";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";
import {
  LEARN_UPGRADE_CLIP_BOTTOM,
  LEARN_UPGRADE_CLIP_TOP,
  LEARN_UPGRADE_COLUMN_X,
  LEARN_UPGRADE_HEADER_GAP,
  LEARN_UPGRADE_ROW_GAP,
  LEARN_UPGRADE_ROW_WIDTH,
  applyLearnUpgradeWheel,
  clampLearnUpgradeScroll,
  learnUpgradeBarRects,
  learnUpgradeColumnAt,
  learnUpgradeContentHeight,
  learnUpgradeRowVisible,
  learnUpgradeScrollExtent,
  learnUpgradeViewportHeight,
} from "./learnUpgradeScroll";

describe("learnUpgradeBarRects", () => {
  it("covers each gutter through the upgrade column so the maze clips underneath", () => {
    expect(learnUpgradeBarRects()).toEqual([
      {
        x: 0,
        y: 0,
        w: LEARN_UPGRADE_COLUMN_X.left + LEARN_UPGRADE_ROW_WIDTH,
        h: PLAYFIELD_HEIGHT,
      },
      {
        x: LEARN_UPGRADE_COLUMN_X.right,
        y: 0,
        w: PLAYFIELD_WIDTH - LEARN_UPGRADE_COLUMN_X.right,
        h: PLAYFIELD_HEIGHT,
      },
    ]);
  });

  it("returns no rects for a zero-sized playfield", () => {
    expect(learnUpgradeBarRects(0, PLAYFIELD_HEIGHT)).toEqual([]);
    expect(learnUpgradeBarRects(PLAYFIELD_WIDTH, 0)).toEqual([]);
  });
});

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

  it("returns the overflow when a column is taller than the clip band", () => {
    const viewport = learnUpgradeViewportHeight();
    const content = viewport + 48;
    expect(learnUpgradeScrollExtent(content)).toBe(48);
  });

  it("spans from the ghost-slot tops through the BACK label bottom", () => {
    expect(LEARN_UPGRADE_CLIP_TOP).toBe(66);
    expect(LEARN_UPGRADE_CLIP_BOTTOM).toBe(558);
    expect(learnUpgradeViewportHeight()).toBe(492);
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

describe("learnUpgradeColumnAt", () => {
  const midY = (LEARN_UPGRADE_CLIP_TOP + LEARN_UPGRADE_CLIP_BOTTOM) / 2;

  it("hits each gutter and ignores the maze", () => {
    expect(learnUpgradeColumnAt(LEARN_UPGRADE_COLUMN_X.left, midY)).toBe("left");
    expect(
      learnUpgradeColumnAt(LEARN_UPGRADE_COLUMN_X.left + LEARN_UPGRADE_ROW_WIDTH - 1, midY),
    ).toBe("left");
    expect(learnUpgradeColumnAt(LEARN_UPGRADE_COLUMN_X.right, midY)).toBe("right");
    expect(learnUpgradeColumnAt(400, midY)).toBeNull();
  });

  it("ignores the column strip outside the clip band", () => {
    expect(
      learnUpgradeColumnAt(LEARN_UPGRADE_COLUMN_X.left, LEARN_UPGRADE_CLIP_TOP - 1),
    ).toBeNull();
    expect(
      learnUpgradeColumnAt(LEARN_UPGRADE_COLUMN_X.right, LEARN_UPGRADE_CLIP_BOTTOM),
    ).toBeNull();
    expect(learnUpgradeColumnAt(LEARN_UPGRADE_COLUMN_X.left, LEARN_UPGRADE_CLIP_TOP)).toBe("left");
  });
});

describe("learnUpgradeRowVisible", () => {
  const firstHeaderY = LEARN_UPGRADE_CLIP_TOP - LEARN_UPGRADE_ROW_GAP + LEARN_UPGRADE_HEADER_GAP;

  it("hides rows scrolled above the clip top", () => {
    expect(learnUpgradeRowVisible(firstHeaderY, 0)).toBe(true);
    expect(learnUpgradeRowVisible(firstHeaderY, 40)).toBe(false);
  });

  it("hides rows below the clip bottom", () => {
    const localY = LEARN_UPGRADE_CLIP_BOTTOM + 20;
    expect(learnUpgradeRowVisible(localY, 0)).toBe(false);
    expect(learnUpgradeRowVisible(localY, 40)).toBe(true);
  });

  it("keeps the first header in view at scroll 0", () => {
    expect(firstHeaderY).toBe(70);
    expect(learnUpgradeRowVisible(firstHeaderY, 0)).toBe(true);
    expect(LEARN_UPGRADE_CLIP_TOP).toBeLessThan(firstHeaderY);
  });
});
