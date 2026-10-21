import { describe, expect, it } from "vitest";
import {
  GHOST_ART_SIZE_PX,
  GHOST_PUPIL_ART_PX,
  GHOST_PUPIL_LOOK_OFFSET_ART,
  GHOST_PUPIL_REST_ART,
  blinkyEyesTrackPlayer,
  ghostPupilLookOffset,
  ghostPupilLookToward,
  ghostPupilRects,
  ghostPupilsVisible,
  GHOST_PUPIL_TURN_MS,
  stepGhostPupilLook,
} from "./ghostPupils";
import { GHOST_DIR } from "./ghostPath";

describe("ghostPupilsVisible", () => {
  it("shows only for primary ghosts that are not frightened", () => {
    expect(ghostPupilsVisible({ inFrightenedSet: false, drawKind: "primary" })).toBe(true);
    expect(ghostPupilsVisible({ inFrightenedSet: true, drawKind: "primary" })).toBe(false);
    expect(ghostPupilsVisible({ inFrightenedSet: false, drawKind: "afterimage" })).toBe(false);
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
    const rects = ghostPupilRects(100, 50, displaySize, ghostPupilLookOffset(GHOST_DIR.none));
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
    const rest = ghostPupilRects(0, 0, displaySize, ghostPupilLookOffset(GHOST_DIR.none));
    const looking = ghostPupilRects(0, 0, displaySize, ghostPupilLookOffset(GHOST_DIR.right));
    expect(looking[0]!.x - rest[0]!.x).toBeCloseTo(GHOST_PUPIL_LOOK_OFFSET_ART * scale);
    expect(looking[0]!.y).toBeCloseTo(rest[0]!.y);
  });

  it("keeps eased or aimed looks on whole art pixels", () => {
    for (const rect of ghostPupilRects(8, 8, GHOST_ART_SIZE_PX, { dx: 0.7, dy: -0.3 })) {
      expect(Number.isInteger(rect.x)).toBe(true);
      expect(Number.isInteger(rect.y)).toBe(true);
    }
  });
});

describe("stepGhostPupilLook", () => {
  it("starts at the facing offset with no tween", () => {
    const { look } = stepGhostPupilLook(undefined, GHOST_DIR.left, 1000);
    expect(look).toEqual({ dx: -GHOST_PUPIL_LOOK_OFFSET_ART, dy: 0 });
  });

  it("glides to a new facing over the turn duration", () => {
    const a = stepGhostPupilLook(undefined, GHOST_DIR.left, 0);
    const start = stepGhostPupilLook(a.state, GHOST_DIR.right, 100);
    expect(start.look.dx).toBeCloseTo(-GHOST_PUPIL_LOOK_OFFSET_ART);
    const mid = stepGhostPupilLook(start.state, GHOST_DIR.right, 100 + GHOST_PUPIL_TURN_MS / 2);
    expect(mid.look.dx).toBeCloseTo(0);
    const end = stepGhostPupilLook(mid.state, GHOST_DIR.right, 100 + GHOST_PUPIL_TURN_MS);
    expect(end.look.dx).toBeCloseTo(GHOST_PUPIL_LOOK_OFFSET_ART);
  });

  it("retargets from the in-flight position without jumping", () => {
    const a = stepGhostPupilLook(undefined, GHOST_DIR.left, 0);
    const b = stepGhostPupilLook(a.state, GHOST_DIR.right, 0);
    const mid = stepGhostPupilLook(b.state, GHOST_DIR.right, GHOST_PUPIL_TURN_MS / 2);
    const turned = stepGhostPupilLook(mid.state, GHOST_DIR.up, GHOST_PUPIL_TURN_MS / 2);
    expect(turned.look.dx).toBeCloseTo(mid.look.dx);
    expect(turned.look.dy).toBeCloseTo(mid.look.dy);
  });
});

describe("blinkyEyesTrackPlayer", () => {
  it("starts at level 4", () => {
    expect([1, 2, 3, 4, 5, 9].map(blinkyEyesTrackPlayer)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
    ]);
  });
});

describe("ghostPupilLookToward", () => {
  it("points a unit look offset at the target, at any distance", () => {
    const near = ghostPupilLookToward(3, 4);
    const far = ghostPupilLookToward(300, 400);
    expect(near.dx).toBeCloseTo(0.6 * GHOST_PUPIL_LOOK_OFFSET_ART);
    expect(near.dy).toBeCloseTo(0.8 * GHOST_PUPIL_LOOK_OFFSET_ART);
    expect(far).toEqual(near);
  });

  it("handles diagonals and arbitrary angles, not just the four directions", () => {
    const d = GHOST_PUPIL_LOOK_OFFSET_ART * Math.SQRT1_2;
    const diagonals = [
      { from: [5, 5], to: { dx: d, dy: d } },
      { from: [-5, 5], to: { dx: -d, dy: d } },
      { from: [5, -5], to: { dx: d, dy: -d } },
      { from: [-5, -5], to: { dx: -d, dy: -d } },
    ] as const;
    for (const { from, to } of diagonals) {
      const look = ghostPupilLookToward(from[0], from[1]);
      expect(look.dx).toBeCloseTo(to.dx);
      expect(look.dy).toBeCloseTo(to.dy);
    }
    for (let deg = 0; deg < 360; deg += 7) {
      const rad = (deg * Math.PI) / 180;
      const look = ghostPupilLookToward(Math.cos(rad) * 123, Math.sin(rad) * 123);
      expect(Math.hypot(look.dx, look.dy)).toBeCloseTo(GHOST_PUPIL_LOOK_OFFSET_ART);
      expect(Math.atan2(look.dy, look.dx)).toBeCloseTo(Math.atan2(Math.sin(rad), Math.cos(rad)));
    }
  });

  it("rests when the target is on the ghost", () => {
    expect(ghostPupilLookToward(0, 0)).toEqual({ dx: 0, dy: 0 });
  });
});
