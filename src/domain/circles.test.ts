import { describe, expect, it } from "vitest";
import { circlesOverlap } from "./circles";

describe("circles", () => {
  it("detects overlap and separation", () => {
    expect(circlesOverlap(0, 0, 5, 3, 0, 5)).toBe(true);
    expect(circlesOverlap(0, 0, 5, 20, 0, 5)).toBe(false);
  });
});
