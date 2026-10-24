import { describe, expect, it } from "vitest";
import {
  salvageCardStep,
  salvageCardTitle,
  salvageSelectionStep,
  TRINKET_TOAST_FADE_MS,
  TRINKET_TOAST_HOLD_MS,
  trinketToastAlpha,
  type SalvageKey,
} from "./salvagePanel";

function walk(start: number, keys: SalvageKey[], count = 7): number {
  return keys.reduce((index, key) => salvageSelectionStep(index, key, count, 3).index, start);
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
    expect(salvageSelectionStep(2, "confirm", 7, 3)).toEqual({
      index: 2,
      outcome: "salvage",
    });
  });

  it("backs out on cancel", () => {
    expect(salvageSelectionStep(2, "cancel", 6, 3).outcome).toBe("close");
  });

  it("closes an empty list", () => {
    expect(salvageSelectionStep(0, "confirm", 0, 3).outcome).toBe("close");
  });
});

describe("salvageCardStep", () => {
  it("walks the six owned cards with up and down, wrapping", () => {
    expect(salvageCardStep(0, "down", 6)).toEqual({ index: 1, outcome: null });
    expect(salvageCardStep(5, "down", 6).index).toBe(0);
    expect(salvageCardStep(0, "up", 6).index).toBe(5);
  });

  it("salvages the new card on left and the selected owned card on right or confirm", () => {
    expect(salvageCardStep(3, "left", 6)).toEqual({ index: 3, outcome: "salvageNew" });
    expect(salvageCardStep(3, "right", 6)).toEqual({ index: 3, outcome: "salvageOwned" });
    expect(salvageCardStep(3, "confirm", 6).outcome).toBe("salvageOwned");
  });

  it("has no dismiss", () => {
    expect(salvageCardStep(3, "cancel", 6)).toEqual({ index: 3, outcome: null });
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
