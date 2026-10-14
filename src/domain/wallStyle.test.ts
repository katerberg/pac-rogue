import { describe, expect, it } from "vitest";
import { MAZE_BACKGROUND_COLOR, WALL_CORNER_RADIUS } from "./maze";
import { mazeColorForIndex } from "./mazeColorSettings";
import { DEFAULT_TUNING, resolveTuning } from "./tuning";
import { sameWallStyle, wallStyleFor } from "./wallStyle";

describe("wallStyleFor", () => {
  it("uses defaults without knobs, following the maze color setting", () => {
    expect(wallStyleFor(null, 2)).toEqual({
      color: mazeColorForIndex(2),
      thickness: DEFAULT_TUNING.wallThickness,
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

describe("sameWallStyle", () => {
  it("compares every field and treats null as never drawn", () => {
    const a = wallStyleFor(null, 0);
    expect(sameWallStyle(a, { ...a })).toBe(true);
    expect(sameWallStyle(a, { ...a, thickness: a.thickness + 1 })).toBe(false);
    expect(sameWallStyle(a, null)).toBe(false);
  });
});
