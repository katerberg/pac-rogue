import { describe, expect, it } from "vitest";
import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS, WALL_STROKE_WEIGHT } from "./maze";
import { mazeColorForIndex } from "./mazeColorSettings";
import { DEFAULT_TUNING, resolveTuning } from "./tuning";
import { sameWallStyle, wallGlowFilter, wallStyleFor } from "./wallStyle";

describe("wallStyleFor", () => {
  it("follows the maze color setting without knobs, with the default glow", () => {
    expect(wallStyleFor(null, 2)).toEqual({
      color: mazeColorForIndex(2),
      thickness: WALL_STROKE_WEIGHT,
      glow: DEFAULT_TUNING.wallGlow,
      glowRadius: 4,
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

describe("wallGlowFilter", () => {
  it("is null with no glow strength or radius", () => {
    expect(wallGlowFilter(wallStyleFor(resolveTuning({ wallGlow: 0 }), 0))).toBeNull();
    expect(
      wallGlowFilter(wallStyleFor(resolveTuning({ wallGlow: 0.5, wallGlowRadius: 0 }), 0)),
    ).toBeNull();
  });

  it("scales strength by glow and uses the radius as distance", () => {
    expect(
      wallGlowFilter(wallStyleFor(resolveTuning({ wallGlow: 0.5, wallGlowRadius: 6 }), 0)),
    ).toEqual({ outerStrength: 2, distance: 6 });
  });

  it("does not glow by default", () => {
    expect(wallGlowFilter(wallStyleFor(null, 0))).toBeNull();
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
