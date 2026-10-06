import { describe, expect, it } from "vitest";
import { canvasSizeFor, MAX_RENDER_SCALE, renderScaleFor } from "./renderScale";

describe("renderScaleFor", () => {
  it("fits the 800x600 world to the view and multiplies by the pixel ratio", () => {
    expect(renderScaleFor(1600, 1200, 1)).toBe(2);
    expect(renderScaleFor(1920, 1080, 1)).toBeCloseTo(1.8);
    expect(renderScaleFor(1440, 900, 2)).toBeCloseTo(3);
    expect(renderScaleFor(900, 700, 1)).toBeCloseTo(1.125);
  });

  it("stays between 1 and the cap", () => {
    expect(renderScaleFor(400, 300, 1)).toBe(1);
    expect(renderScaleFor(3840, 2160, 2)).toBe(MAX_RENDER_SCALE);
    expect(renderScaleFor(0, 0, 1)).toBe(1);
    expect(renderScaleFor(Number.NaN, 600, 1)).toBe(1);
  });
});

describe("canvasSizeFor", () => {
  it("rounds the scaled world to whole canvas pixels", () => {
    expect(canvasSizeFor(3)).toEqual({ width: 2400, height: 1800 });
    expect(canvasSizeFor(1.8)).toEqual({ width: 1440, height: 1080 });
    expect(canvasSizeFor(1.125)).toEqual({ width: 900, height: 675 });
  });
});
