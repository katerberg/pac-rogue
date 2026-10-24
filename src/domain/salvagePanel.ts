import type { UpgradeSource } from "./runLog";

export const TRINKET_TOAST_HOLD_MS = 1400;
export const TRINKET_TOAST_FADE_MS = 400;

export type SalvageKey = "up" | "down" | "left" | "right" | "confirm" | "cancel";

export type SalvageStep = { index: number; outcome: "salvage" | "close" | null };

export function salvageSelectionStep(
  index: number,
  key: SalvageKey,
  count: number,
  columns: number,
): SalvageStep {
  if (count === 0) {
    return { index, outcome: key === "cancel" || key === "confirm" ? "close" : null };
  }
  const lastRow = Math.floor((count - 1) / columns);
  switch (key) {
    case "left":
      return { index: (index + count - 1) % count, outcome: null };
    case "right":
      return { index: (index + 1) % count, outcome: null };
    case "up":
      return { index: index - columns >= 0 ? index - columns : index, outcome: null };
    case "down":
      if (index + columns < count) {
        return { index: index + columns, outcome: null };
      }
      return { index: Math.floor(index / columns) < lastRow ? count - 1 : index, outcome: null };
    case "confirm":
      return { index, outcome: "salvage" };
    case "cancel":
      return { index, outcome: "close" };
  }
}

export type SalvageCardStep = { index: number; outcome: "salvageNew" | "salvageOwned" | null };

export function salvageCardStep(index: number, key: SalvageKey, count: number): SalvageCardStep {
  switch (key) {
    case "up":
      return { index: (index + count - 1) % count, outcome: null };
    case "down":
      return { index: (index + 1) % count, outcome: null };
    case "left":
      return { index, outcome: "salvageNew" };
    case "right":
    case "confirm":
      return { index, outcome: "salvageOwned" };
    case "cancel":
      return { index, outcome: null };
  }
}

export function salvageCardTitle(source: UpgradeSource): string {
  return source === "slots" ? "BONUS UPGRADE!" : "NEW UPGRADE!";
}

export function trinketToastAlpha(elapsedMs: number): number {
  if (elapsedMs <= TRINKET_TOAST_HOLD_MS) {
    return 1;
  }
  return Math.max(0, 1 - (elapsedMs - TRINKET_TOAST_HOLD_MS) / TRINKET_TOAST_FADE_MS);
}
