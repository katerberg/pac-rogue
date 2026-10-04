import { describe, expect, it } from "vitest";
import {
  HAUNT_CAGE_BARS,
  HAUNT_CAGE_BLINK_MS,
  HAUNT_CAGE_SIZE_MUL,
  HAUNT_CAGE_URGENCY_MS,
  hauntCageLines,
  hauntCageVisible,
} from "./hauntCage";

describe("hauntCageVisible", () => {
  it("is hidden when no haunt is running", () => {
    expect(hauntCageVisible(0, 0)).toBe(false);
  });

  it("stays solid until the last second", () => {
    expect(hauntCageVisible(HAUNT_CAGE_URGENCY_MS + 1, HAUNT_CAGE_BLINK_MS)).toBe(true);
  });

  it("never blinks for a rest-of-level haunt", () => {
    expect(hauntCageVisible(Number.POSITIVE_INFINITY, HAUNT_CAGE_BLINK_MS)).toBe(true);
  });

  it("blinks every blink period in the last second", () => {
    expect(hauntCageVisible(HAUNT_CAGE_URGENCY_MS, 0)).toBe(true);
    expect(hauntCageVisible(HAUNT_CAGE_URGENCY_MS, HAUNT_CAGE_BLINK_MS)).toBe(false);
    expect(hauntCageVisible(HAUNT_CAGE_URGENCY_MS, HAUNT_CAGE_BLINK_MS * 2)).toBe(true);
  });
});

describe("hauntCageLines", () => {
  it("draws a frame plus evenly spaced vertical bars around the ghost", () => {
    const lines = hauntCageLines(100, 50, 20);
    const half = (20 * HAUNT_CAGE_SIZE_MUL) / 2;
    expect(lines).toHaveLength(4 + HAUNT_CAGE_BARS);
    expect(lines[0]).toEqual({ x1: 100 - half, y1: 50 - half, x2: 100 + half, y2: 50 - half });
    const bars = lines.slice(4);
    expect(bars.map((l) => l.x1)).toEqual([100 - half / 2, 100, 100 + half / 2]);
    for (const bar of bars) {
      expect(bar.y1).toBe(50 - half);
      expect(bar.y2).toBe(50 + half);
    }
  });
});
