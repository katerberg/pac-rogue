import { describe, expect, it } from "vitest";
import {
  GHOST_ART_SIZE_PX,
  GHOST_PUPIL_ART_PX,
  GHOST_PUPIL_LOOK_OFFSET_ART,
  GHOST_PUPIL_REST_ART,
  ghostPupilLookOffset,
  ghostPupilRects,
  ghostPupilsVisible,
} from "./ghostPupils";
import { GHOST_DIR } from "./ghostPath";

describe("ghostPupilsVisible", () => {
  it("shows only for pixel primary ghosts that are not frightened", () => {
    expect(
      ghostPupilsVisible({ style: "pixel", inFrightenedSet: false, drawKind: "primary" }),
    ).toBe(true);
    expect(ghostPupilsVisible({ style: "neon", inFrightenedSet: false, drawKind: "primary" })).toBe(
      false,
    );
    expect(
      ghostPupilsVisible({ style: "lined", inFrightenedSet: false, drawKind: "primary" }),
    ).toBe(false);
    expect(ghostPupilsVisible({ style: "pixel", inFrightenedSet: true, drawKind: "primary" })).toBe(
      false,
    );
    expect(
      ghostPupilsVisible({ style: "pixel", inFrightenedSet: false, drawKind: "afterimage" }),
    ).toBe(false);
  });
});

describe("ghostPupilLookOffset", () => {
  it("shifts one art pixel on cardinal facing and rests on none", () => {
    expect(ghostPupilLookOffset(GHOST_DIR.none)).toEqual({ dx: 0, dy: 0 });
    expect(ghostPupilLookOffset(GHOST_DIR.up)).toEqual({
      dx: 0,
      dy: -GHOST_PUPIL_LOOK_OFFSET_ART,
    });
    expect(ghostPupilLookOffset(GHOST_DIR.down)).toEqual({
      dx: 0,
      dy: GHOST_PUPIL_LOOK_OFFSET_ART,
    });
    expect(ghostPupilLookOffset(GHOST_DIR.left)).toEqual({
      dx: -GHOST_PUPIL_LOOK_OFFSET_ART,
      dy: 0,
    });
    expect(ghostPupilLookOffset(GHOST_DIR.right)).toEqual({
      dx: GHOST_PUPIL_LOOK_OFFSET_ART,
      dy: 0,
    });
  });
});

describe("ghostPupilRects", () => {
  it("maps rest art top-lefts into world space for a known display size", () => {
    const displaySize = GHOST_ART_SIZE_PX;
    const rects = ghostPupilRects(100, 50, displaySize, GHOST_DIR.none);
    expect(rects).toHaveLength(2);
    expect(rects[0]).toEqual({
      x: 100 - displaySize / 2 + GHOST_PUPIL_REST_ART[0].x,
      y: 50 - displaySize / 2 + GHOST_PUPIL_REST_ART[0].y,
      w: GHOST_PUPIL_ART_PX,
      h: GHOST_PUPIL_ART_PX,
    });
    expect(rects[1]).toEqual({
      x: 100 - displaySize / 2 + GHOST_PUPIL_REST_ART[1].x,
      y: 50 - displaySize / 2 + GHOST_PUPIL_REST_ART[1].y,
      w: GHOST_PUPIL_ART_PX,
      h: GHOST_PUPIL_ART_PX,
    });
  });

  it("applies facing offset in art space before scaling", () => {
    const displaySize = 32;
    const scale = displaySize / GHOST_ART_SIZE_PX;
    const rest = ghostPupilRects(0, 0, displaySize, GHOST_DIR.none);
    const looking = ghostPupilRects(0, 0, displaySize, GHOST_DIR.right);
    expect(looking[0]!.x - rest[0]!.x).toBeCloseTo(GHOST_PUPIL_LOOK_OFFSET_ART * scale);
    expect(looking[0]!.y).toBeCloseTo(rest[0]!.y);
  });
});
