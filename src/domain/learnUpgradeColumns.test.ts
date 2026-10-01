import { describe, expect, it } from "vitest";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";
import { hoverPreviewX, splitSchoolColumns, type SchoolGroup } from "./learnUpgradeColumns";
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
    expect(right.map((g) => g.school)).toEqual(["protection"]);
  });

  it("splits six schools 3 and 3 in order", () => {
    const { left, right } = splitSchoolColumns(groups(6));
    expect(left.map((g) => g.school)).toEqual(["death", "harvest", "speed"]);
    expect(right.map((g) => g.school)).toEqual(["protection", "disruption", "neutral"]);
  });

  it("keeps any schools past the sixth on the right", () => {
    const extra = [...groups(6), { school: "neutral" as const, defs: [] }];
    expect(splitSchoolColumns(extra).right).toHaveLength(4);
  });
});

describe("hoverPreviewX", () => {
  it("mirrors the preview anchor across the playfield", () => {
    expect(hoverPreviewX("left")).toBe(110);
    expect(hoverPreviewX("right")).toBe(PLAYFIELD_WIDTH - 110);
  });
});
