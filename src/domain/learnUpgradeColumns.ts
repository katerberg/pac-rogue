import { PLAYFIELD_WIDTH } from "./playfieldBounds";
import type { groupUpgradesBySchool } from "./upgrades";

export const LEARN_SCHOOLS_PER_COLUMN = 3;

export type LearnColumn = "left" | "right";

export type SchoolGroup = ReturnType<typeof groupUpgradesBySchool>[number];

const HOVER_PREVIEW_INSET_X = 110;

export function splitSchoolColumns(
  groups: readonly SchoolGroup[],
): Record<LearnColumn, SchoolGroup[]> {
  return {
    left: groups.slice(0, LEARN_SCHOOLS_PER_COLUMN),
    right: groups.slice(LEARN_SCHOOLS_PER_COLUMN),
  };
}

export function hoverPreviewX(column: LearnColumn): number {
  return column === "left" ? HOVER_PREVIEW_INSET_X : PLAYFIELD_WIDTH - HOVER_PREVIEW_INSET_X;
}
