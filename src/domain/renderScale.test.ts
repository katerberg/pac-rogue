import { describe, expect, it } from "vitest";
import { canvasDisplayZoom, canvasSizeFor, MAX_RENDER_SCALE, renderScaleFor } from "./renderScale";

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
  it("floors the scaled world to whole canvas pixels", () => {
    expect(canvasSizeFor(3)).toEqual({ width: 2400, height: 1800 });
    expect(canvasSizeFor(1.8)).toEqual({ width: 1440, height: 1080 });
    expect(canvasSizeFor(1.125)).toEqual({ width: 900, height: 675 });
    expect(canvasSizeFor(renderScaleFor(1512, 982, 2))).toEqual({ width: 2618, height: 1964 });
  });
});

describe("canvasDisplayZoom", () => {
  it("shows one canvas pixel per device pixel when the canvas fits the view", () => {
    for (const [w, h, dpr] of [
      [1512, 982, 2],
      [900, 700, 1],
      [1366, 768, 1.25],
      [3840, 2160, 2],
    ] as const) {
      const canvas = canvasSizeFor(renderScaleFor(w, h, dpr));
      expect(canvasDisplayZoom(canvas, w, h, dpr)).toBe(1 / dpr);
    }
  });

  it("shrinks the minimum-scale canvas into a view too small for it", () => {
    expect(canvasDisplayZoom(canvasSizeFor(1), 400, 300, 1)).toBe(0.5);
    expect(canvasDisplayZoom(canvasSizeFor(1), 0, 0, 1)).toBe(1);
  });
});
