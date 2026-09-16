import { describe, expect, it } from "vitest";
import { computePixelZoom } from "./pixelZoom";

describe("computePixelZoom", () => {
  it("uses integer zoom when the parent fits at least 1x", () => {
    expect(computePixelZoom(800, 600)).toBe(1);
    expect(computePixelZoom(1600, 1200)).toBe(2);
    expect(computePixelZoom(1920, 1080)).toBe(1);
    expect(computePixelZoom(1920, 1200)).toBe(2);
  });

  it("downscales continuously when the parent is smaller than the playfield", () => {
    expect(computePixelZoom(400, 300)).toBeCloseTo(0.5);
    expect(computePixelZoom(800, 400)).toBeCloseTo(400 / 600);
    expect(computePixelZoom(600, 600)).toBeCloseTo(600 / 800);
  });

  it("returns 1 for empty parent bounds", () => {
    expect(computePixelZoom(0, 0)).toBe(1);
    expect(computePixelZoom(-1, 600)).toBe(1);
  });
});
