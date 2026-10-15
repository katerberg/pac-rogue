import { describe, expect, it } from "vitest";
import { wallPathCommands } from "./maze";
import { pixelWallRects, WALL_ART_PX } from "./pixelWall";

describe("pixelWallRects", () => {
  it("draws a straight edge as art-pixel aligned rects of the given thickness", () => {
    const rects = pixelWallRects(
      [
        { type: "move", x: 0, y: 10 },
        { type: "line", x: 20, y: 10 },
      ],
      2,
    );
    expect(rects).toEqual([{ x: 0, y: 10, w: 22, h: 2 }]);
  });

  it("steps a diagonal one art pixel at a time instead of anti-aliasing", () => {
    const rects = pixelWallRects(
      [
        { type: "move", x: 0, y: 0 },
        { type: "line", x: 6, y: 6 },
      ],
      2,
    );
    expect(rects).toHaveLength(4);
    expect(rects.every((r) => r.w === WALL_ART_PX && r.h === WALL_ART_PX)).toBe(true);
  });

  it("snaps every maze wall rect to the art-pixel grid", () => {
    const rects = pixelWallRects(wallPathCommands(), 1.5);
    expect(rects.length).toBeGreaterThan(0);
    for (const r of rects) {
      expect(r.x % WALL_ART_PX).toBe(0);
      expect(r.y % WALL_ART_PX).toBe(0);
      expect(r.w % WALL_ART_PX).toBe(0);
      expect(r.h).toBe(WALL_ART_PX);
    }
  });

  it("thickens in whole art pixels", () => {
    const one = pixelWallRects(
      [
        { type: "move", x: 0, y: 0 },
        { type: "line", x: 10, y: 0 },
      ],
      1.5,
    );
    const three = pixelWallRects(
      [
        { type: "move", x: 0, y: 0 },
        { type: "line", x: 10, y: 0 },
      ],
      6,
    );
    expect(one).toHaveLength(1);
    expect(three).toHaveLength(3);
  });
});
