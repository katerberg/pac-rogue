import { describe, expect, it } from "vitest";
import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS, WALL_STROKE_WEIGHT } from "./maze";
import { mazeColorForIndex } from "./mazeColorSettings";
import { resolveTuning } from "./tuning";
import { sameWallStyle, wallGlowLayers, wallStyleFor } from "./wallStyle";

describe("wallStyleFor", () => {
  it("keeps today's look without knobs, following the maze color setting", () => {
    expect(wallStyleFor(null, 2)).toEqual({
      color: mazeColorForIndex(2),
      thickness: WALL_STROKE_WEIGHT,
      glow: 0,
      glowRadius: 0,
      cornerRadius: WALL_CORNER_RADIUS,
      background: MAZE_BACKGROUND_COLOR,
    });
  });

  it("uses the knob values with knobs on", () => {
    const style = wallStyleFor(resolveTuning({ wallColor: 0xff0000, wallThickness: 5 }), 2);
    expect(style.color).toBe(0xff0000);
    expect(style.thickness).toBe(5);
  });
});

describe("wallGlowLayers", () => {
  it("is empty with no glow", () => {
    expect(wallGlowLayers(wallStyleFor(null, 0))).toEqual([]);
    expect(
      wallGlowLayers(wallStyleFor(resolveTuning({ wallGlow: 0.5, wallGlowRadius: 0 }), 0)),
    ).toEqual([]);
  });

  it("draws four layers, widest and faintest first", () => {
    const layers = wallGlowLayers(
      wallStyleFor(resolveTuning({ wallGlow: 1, wallGlowRadius: 4, wallThickness: 2 }), 0),
    );
    expect(layers.map((l) => l.width)).toEqual([10, 8, 6, 4]);
    expect(layers[0]!.alpha).toBeLessThan(layers[3]!.alpha);
    expect(layers[3]!.alpha).toBeCloseTo(0.35);
  });
});

describe("sameWallStyle", () => {
  it("compares every field and treats null as never drawn", () => {
    const a = wallStyleFor(null, 0);
    expect(sameWallStyle(a, { ...a })).toBe(true);
    expect(sameWallStyle(a, { ...a, glow: 0.1 })).toBe(false);
    expect(sameWallStyle(a, null)).toBe(false);
  });
});
