import { describe, expect, it } from "vitest";
import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS } from "./maze";
import { mazeColorForIndex } from "./mazeColorSettings";
import { DEFAULT_TUNING, resolveTuning } from "./tuning";
import { sameWallStyle, wallGlowFilter, wallStyleFor } from "./wallStyle";

describe("wallStyleFor", () => {
  it("uses neon defaults without knobs, following the maze color setting", () => {
    expect(wallStyleFor(null, 2, "neon")).toEqual({
      color: mazeColorForIndex(2),
      thickness: DEFAULT_TUNING.wallThickness,
      glow: DEFAULT_TUNING.wallGlow,
      glowRadius: DEFAULT_TUNING.wallGlowRadius,
      cornerRadius: WALL_CORNER_RADIUS,
      background: MAZE_BACKGROUND_COLOR,
    });
  });

  it("turns wall glow off under PIXEL style without knobs", () => {
    expect(wallStyleFor(null, 0, "pixel")).toEqual({
      color: mazeColorForIndex(0),
      thickness: DEFAULT_TUNING.wallThickness,
      glow: 0,
      glowRadius: 0,
      cornerRadius: WALL_CORNER_RADIUS,
      background: MAZE_BACKGROUND_COLOR,
    });
  });

  it("uses the knob values with knobs on, ignoring style", () => {
    const style = wallStyleFor(
      resolveTuning({ wallColor: 0xff0000, wallThickness: 5, wallGlow: 3 }),
      2,
      "pixel",
    );
    expect(style.color).toBe(0xff0000);
    expect(style.thickness).toBe(5);
    expect(style.glow).toBe(3);
  });
});

describe("wallGlowFilter", () => {
  it("is null with no glow strength or radius", () => {
    expect(wallGlowFilter(wallStyleFor(resolveTuning({ wallGlow: 0 }), 0))).toBeNull();
    expect(
      wallGlowFilter(wallStyleFor(resolveTuning({ wallGlow: 0.5, wallGlowRadius: 0 }), 0)),
    ).toBeNull();
  });

  it("uses glow as raw outerStrength and radius as distance", () => {
    expect(
      wallGlowFilter(wallStyleFor(resolveTuning({ wallGlow: 3, wallGlowRadius: 6 }), 0)),
    ).toEqual({ outerStrength: 3, distance: 6 });
  });

  it("glows by default under NEON and not under PIXEL", () => {
    expect(wallGlowFilter(wallStyleFor(null, 0, "neon"))).toEqual({
      outerStrength: 2.4,
      distance: 4,
    });
    expect(wallGlowFilter(wallStyleFor(null, 0, "pixel"))).toBeNull();
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
