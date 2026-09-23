import { describe, expect, it } from "vitest";
import { circlesOverlap } from "./circles";

describe("circles", () => {
  it("detects overlap and separation", () => {
    expect(circlesOverlap(0, 0, 5, 3, 0, 5)).toBe(true);
    expect(circlesOverlap(0, 0, 5, 20, 0, 5)).toBe(false);
  });

  it("requires a minimum overlap fraction of the combined radii when given", () => {
    // reach = 10; touching at distance 9 is within plain reach but under 20% overlap
    expect(circlesOverlap(0, 0, 5, 9, 0, 5)).toBe(true);
    expect(circlesOverlap(0, 0, 5, 9, 0, 5, 0.2)).toBe(false);
    // distance 7.9 is just inside 80% of reach (8), so it clears the 20% overlap bar
    expect(circlesOverlap(0, 0, 5, 7.9, 0, 5, 0.2)).toBe(true);
  });
});
