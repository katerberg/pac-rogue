import { describe, expect, it } from "vitest";
import {
  SALVAGE_ALERT_BLINK_MS,
  SALVAGE_ALERT_MS,
  salvageAlertFrame,
  salvageSelectionStep,
  TRINKET_TOAST_FADE_MS,
  TRINKET_TOAST_HOLD_MS,
  trinketToastAlpha,
  type SalvageKey,
} from "./salvagePanel";

function walk(start: number, keys: SalvageKey[], count = 7): number {
  return keys.reduce(
    (index, key) => salvageSelectionStep(index, key, count, 3, false).index,
    start,
  );
}

describe("salvageSelectionStep", () => {
  it("wraps left and right through all seven", () => {
    expect(walk(6, ["right"])).toBe(0);
    expect(walk(0, ["left"])).toBe(6);
  });

  it("moves by rows on the three-column grid", () => {
    expect(walk(6, ["up"])).toBe(3);
    expect(walk(1, ["down"])).toBe(4);
    expect(walk(4, ["down"])).toBe(6);
    expect(walk(6, ["down"])).toBe(6);
    expect(walk(1, ["up"])).toBe(1);
  });

  it("salvages the selection on confirm", () => {
    expect(salvageSelectionStep(2, "confirm", 7, 3, false)).toEqual({
      index: 2,
      outcome: "salvage",
    });
  });

  it("only backs out when cancellable", () => {
    expect(salvageSelectionStep(2, "cancel", 7, 3, false).outcome).toBeNull();
    expect(salvageSelectionStep(2, "cancel", 6, 3, true).outcome).toBe("close");
  });

  it("closes an empty list", () => {
    expect(salvageSelectionStep(0, "confirm", 0, 3, true).outcome).toBe("close");
  });
});

describe("salvageAlertFrame", () => {
  it("blinks the outline, then hands over to selection", () => {
    expect(salvageAlertFrame(0)).toEqual({ phase: "alert", outlineVisible: true });
    expect(salvageAlertFrame(SALVAGE_ALERT_BLINK_MS).outlineVisible).toBe(false);
    expect(salvageAlertFrame(SALVAGE_ALERT_BLINK_MS * 2).outlineVisible).toBe(true);
    expect(salvageAlertFrame(SALVAGE_ALERT_MS)).toEqual({ phase: "select", outlineVisible: true });
  });
});

describe("trinketToastAlpha", () => {
  it("holds, then fades out", () => {
    expect(trinketToastAlpha(0)).toBe(1);
    expect(trinketToastAlpha(TRINKET_TOAST_HOLD_MS)).toBe(1);
    expect(trinketToastAlpha(TRINKET_TOAST_HOLD_MS + TRINKET_TOAST_FADE_MS / 2)).toBeCloseTo(0.5);
    expect(trinketToastAlpha(TRINKET_TOAST_HOLD_MS + TRINKET_TOAST_FADE_MS)).toBe(0);
  });
});
