import { describe, expect, it } from "vitest";
import {
  salvageCardStep,
  salvageCardTitle,
  TRINKET_TOAST_FADE_MS,
  TRINKET_TOAST_HOLD_MS,
  trinketToastAlpha,
} from "./salvagePanel";

describe("salvageCardStep", () => {
  it("walks the six owned cards with left and right, wrapping", () => {
    expect(salvageCardStep(0, "right", 6)).toEqual({ index: 1, outcome: null });
    expect(salvageCardStep(5, "right", 6).index).toBe(0);
    expect(salvageCardStep(0, "left", 6).index).toBe(5);
  });

  it("skips the new card on up and salvages the selected owned card on down or confirm", () => {
    expect(salvageCardStep(3, "up", 6)).toEqual({ index: 3, outcome: "salvageNew" });
    expect(salvageCardStep(3, "down", 6)).toEqual({ index: 3, outcome: "salvageOwned" });
    expect(salvageCardStep(3, "confirm", 6).outcome).toBe("salvageOwned");
  });
});

describe("salvageCardTitle", () => {
  it("calls a slot win a bonus", () => {
    expect(salvageCardTitle("slots")).toBe("BONUS UPGRADE!");
    expect(salvageCardTitle("offer")).toBe("NEW UPGRADE!");
    expect(salvageCardTitle("store")).toBe("NEW UPGRADE!");
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
