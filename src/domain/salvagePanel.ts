export const SALVAGE_ALERT_BLINKS = 3;
export const SALVAGE_ALERT_BLINK_MS = 180;
export const SALVAGE_ALERT_MS = SALVAGE_ALERT_BLINKS * 2 * SALVAGE_ALERT_BLINK_MS;
export const TRINKET_TOAST_HOLD_MS = 1400;
export const TRINKET_TOAST_FADE_MS = 400;

export type SalvageKey = "up" | "down" | "left" | "right" | "confirm" | "cancel";

export type SalvageStep = { index: number; outcome: "salvage" | "close" | null };

export function salvageSelectionStep(
  index: number,
  key: SalvageKey,
  count: number,
  columns: number,
  cancellable: boolean,
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
      return { index, outcome: cancellable ? "close" : null };
  }
}

export function salvageAlertFrame(elapsedMs: number): {
  phase: "alert" | "select";
  outlineVisible: boolean;
} {
  if (elapsedMs >= SALVAGE_ALERT_MS) {
    return { phase: "select", outlineVisible: true };
  }
  return {
    phase: "alert",
    outlineVisible: Math.floor(elapsedMs / SALVAGE_ALERT_BLINK_MS) % 2 === 0,
  };
}

export function trinketToastAlpha(elapsedMs: number): number {
  if (elapsedMs <= TRINKET_TOAST_HOLD_MS) {
    return 1;
  }
  return Math.max(0, 1 - (elapsedMs - TRINKET_TOAST_HOLD_MS) / TRINKET_TOAST_FADE_MS);
}
