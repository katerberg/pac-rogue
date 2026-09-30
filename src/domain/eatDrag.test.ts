import { describe, expect, it } from "vitest";
import {
  EAT_DRAG_MS,
  EAT_DRAG_PEAK,
  EAT_DRAG_POWER_MS,
  eatDragAfterCollect,
  eatDragMultiplier,
  tickEatDrag,
} from "./eatDrag";

describe("eatDrag", () => {
  it("starts a short drag for a regular dot and a longer one for a power pellet", () => {
    expect(eatDragAfterCollect(0, 1, 0)).toBe(EAT_DRAG_MS);
    expect(eatDragAfterCollect(0, 0, 1)).toBe(EAT_DRAG_POWER_MS);
    expect(EAT_DRAG_POWER_MS).toBe(EAT_DRAG_MS * 3);
  });

  it("leaves the drag alone when nothing was eaten", () => {
    expect(eatDragAfterCollect(40, 0, 0)).toBe(40);
  });

  it("restarts rather than stacks, and never shortens a longer drag", () => {
    expect(eatDragAfterCollect(30, 4, 0)).toBe(EAT_DRAG_MS);
    expect(eatDragAfterCollect(EAT_DRAG_POWER_MS, 1, 0)).toBe(EAT_DRAG_POWER_MS);
  });

  it("counts down to zero", () => {
    expect(tickEatDrag(100, 40)).toBe(60);
    expect(tickEatDrag(10, 40)).toBe(0);
  });

  it("is full speed at rest, peaks right after eating, and eases back", () => {
    expect(eatDragMultiplier(0)).toBe(1);
    expect(eatDragMultiplier(EAT_DRAG_MS)).toBeCloseTo(1 - EAT_DRAG_PEAK);
    expect(eatDragMultiplier(EAT_DRAG_MS / 2)).toBeCloseTo(1 - EAT_DRAG_PEAK / 2);
  });

  it("holds the peak for the extra time of a power-pellet drag", () => {
    expect(eatDragMultiplier(EAT_DRAG_POWER_MS)).toBeCloseTo(1 - EAT_DRAG_PEAK);
  });
});
