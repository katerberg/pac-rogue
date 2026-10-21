import { describe, expect, it } from "vitest";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";
import {
  LEARN_BACK_Y,
  hoverPreviewX,
  learnHoverPreviewCenter,
  splitSchoolColumns,
  type SchoolGroup,
} from "./learnUpgradeColumns";
import { UPGRADE_SCHOOL_ORDER } from "./upgrades";

const groups = (count: number): SchoolGroup[] =>
  UPGRADE_SCHOOL_ORDER.slice(0, count).map((school) => ({ school, defs: [] }));

describe("splitSchoolColumns", () => {
  it("returns two empty columns for no schools", () => {
    expect(splitSchoolColumns([])).toEqual({ left: [], right: [] });
  });

  it("fills the left column first", () => {
    const { left, right } = splitSchoolColumns(groups(2));
    expect(left.map((g) => g.school)).toEqual(["death", "harvest"]);
    expect(right).toEqual([]);
  });

  it("puts the fourth seen school alone on the right", () => {
    const { left, right } = splitSchoolColumns(groups(4));
    expect(left.map((g) => g.school)).toEqual(["death", "harvest", "speed"]);
    expect(right.map((g) => g.school)).toEqual(["automation"]);
  });

  it("splits all seven schools 3 left and 4 right in order", () => {
    const { left, right } = splitSchoolColumns(groups(7));
    expect(left.map((g) => g.school)).toEqual(["death", "harvest", "speed"]);
    expect(right.map((g) => g.school)).toEqual([
      "automation",
      "protection",
      "disruption",
      "neutral",
    ]);
  });
});

describe("hoverPreviewX", () => {
  it("mirrors the preview anchor across the playfield", () => {
    expect(hoverPreviewX("left")).toBe(110);
    expect(hoverPreviewX("right")).toBe(PLAYFIELD_WIDTH - 110);
  });
});

describe("learnHoverPreviewCenter", () => {
  it("keeps BACK in the shared constant used by the BACK label", () => {
    expect(LEARN_BACK_Y).toBe(PLAYFIELD_HEIGHT - 50);
  });

  it("sits the card flush with the playfield bottom so it cannot clip", () => {
    const cardHeight = 150;
    const center = learnHoverPreviewCenter(cardHeight);
    expect(center).toEqual({
      x: PLAYFIELD_WIDTH / 2,
      y: PLAYFIELD_HEIGHT - cardHeight / 2,
    });
    expect(center.y + cardHeight / 2).toBe(PLAYFIELD_HEIGHT);
    expect(center.y).toBeLessThan(LEARN_BACK_Y);
  });
});
