import type { UpgradeSource } from "./runLog";

export const TRINKET_TOAST_HOLD_MS = 1400;
export const TRINKET_TOAST_FADE_MS = 400;

export type SalvageKey = "up" | "down" | "left" | "right" | "confirm";

export type SalvageCardStep = { index: number; outcome: "salvageNew" | "salvageOwned" | null };

export function salvageCardStep(index: number, key: SalvageKey, count: number): SalvageCardStep {
  switch (key) {
    case "left":
      return { index: (index + count - 1) % count, outcome: null };
    case "right":
      return { index: (index + 1) % count, outcome: null };
    case "up":
      return { index, outcome: "salvageNew" };
    case "down":
    case "confirm":
      return { index, outcome: "salvageOwned" };
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
