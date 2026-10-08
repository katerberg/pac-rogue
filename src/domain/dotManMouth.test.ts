import { describe, expect, it } from "vitest";
import {
  advanceDotManChomp,
  DOTMAN_CHOMP_MOUTH_HALF_DEG,
  DOTMAN_CHOMP_PIXEL_FRAMES,
  DOTMAN_CHOMP_PIXELS_AT_1X,
  DOTMAN_CHOMP_PIXELS_PER_FRAME,
  DOTMAN_CHOMP_SPEED_DEFAULT,
  DOTMAN_INNER_RADIUS,
  DOTMAN_MID_RADIUS,
  DOTMAN_MOUTH_CLOSED_HALF_DEG,
  DOTMAN_MOUTH_OPEN_HALF_DEG,
  DOTMAN_OUTER_RADIUS,
  DOTMAN_VIEW,
  dotManChompMouthHalfDegs,
  dotManChompPixelsPerFrame,
  dotManMouthArt,
  dotManMouthHalfAngle,
  resolveDotManMouthAngles,
} from "./dotManMouth";

const radiusOf = (p: { x: number; y: number }) =>
  Math.hypot(p.x - DOTMAN_VIEW / 2, p.y - DOTMAN_VIEW / 2);

const angleOf = (p: { x: number; y: number }) =>
  (Math.atan2(p.y - DOTMAN_VIEW / 2, p.x - DOTMAN_VIEW / 2) * 180) / Math.PI;

describe("dotManMouthHalfAngle", () => {
  it("rests open when idle and walks the open→mid→closed→mid cycle while moving", () => {
    expect(dotManMouthHalfAngle(2, false)).toBe(DOTMAN_MOUTH_OPEN_HALF_DEG);
    expect(DOTMAN_CHOMP_MOUTH_HALF_DEG).toEqual([
      DOTMAN_MOUTH_OPEN_HALF_DEG,
      (DOTMAN_MOUTH_OPEN_HALF_DEG + DOTMAN_MOUTH_CLOSED_HALF_DEG) / 2,
      DOTMAN_MOUTH_CLOSED_HALF_DEG,
      (DOTMAN_MOUTH_OPEN_HALF_DEG + DOTMAN_MOUTH_CLOSED_HALF_DEG) / 2,
    ]);
    expect(DOTMAN_CHOMP_PIXEL_FRAMES).toHaveLength(DOTMAN_CHOMP_MOUTH_HALF_DEG.length);
    expect(dotManMouthHalfAngle(0, true)).toBe(DOTMAN_MOUTH_OPEN_HALF_DEG);
    expect(dotManMouthHalfAngle(2, true)).toBe(DOTMAN_MOUTH_CLOSED_HALF_DEG);
  });

  it("uses the supplied open/closed angles for the chomp cycle", () => {
    const angles = { openHalfDeg: 60, closedHalfDeg: 10 };
    expect(dotManMouthHalfAngle(0, false, angles)).toBe(60);
    expect(dotManChompMouthHalfDegs(angles)).toEqual([60, 35, 10, 35]);
    expect(dotManMouthHalfAngle(2, true, angles)).toBe(10);
  });
});

describe("resolveDotManMouthAngles", () => {
  it("keeps closed strictly below open", () => {
    expect(resolveDotManMouthAngles(40, 40)).toEqual({ openHalfDeg: 40, closedHalfDeg: 39 });
    expect(resolveDotManMouthAngles(30, 50)).toEqual({ openHalfDeg: 30, closedHalfDeg: 29 });
    expect(resolveDotManMouthAngles(48, 16)).toEqual({
      openHalfDeg: 48,
      closedHalfDeg: 16,
    });
  });
});

describe("dotManChompPixelsPerFrame", () => {
  it("defaults to 2× speed (half the 1× travel distance)", () => {
    expect(DOTMAN_CHOMP_SPEED_DEFAULT).toBe(2);
    expect(DOTMAN_CHOMP_PIXELS_PER_FRAME).toBe(DOTMAN_CHOMP_PIXELS_AT_1X / 2);
    expect(dotManChompPixelsPerFrame(1)).toBe(DOTMAN_CHOMP_PIXELS_AT_1X);
    expect(dotManChompPixelsPerFrame(4)).toBe(DOTMAN_CHOMP_PIXELS_AT_1X / 4);
  });
});

describe("advanceDotManChomp", () => {
  it("advances one beat per travel distance and keeps leftover carry", () => {
    const stepped = advanceDotManChomp(
      { carry: 0, cycleIndex: 0 },
      DOTMAN_CHOMP_PIXELS_PER_FRAME + 3,
    );
    expect(stepped).toEqual({ carry: 3, cycleIndex: 1 });
    expect(advanceDotManChomp(stepped, DOTMAN_CHOMP_PIXELS_PER_FRAME * 3).cycleIndex).toBe(0);
  });
});

describe("dotManMouthArt", () => {
  it("keeps fixed ring radii and opens every lip to the same half-angle", () => {
    for (const half of [DOTMAN_MOUTH_OPEN_HALF_DEG, DOTMAN_MOUTH_CLOSED_HALF_DEG, 30]) {
      const pipe = dotManMouthArt(half).strands.find((s) => s.id === "pipe")!;
      const rings = new Set(pipe.points.map((p) => Math.round(radiusOf(p))));
      expect(rings.has(DOTMAN_OUTER_RADIUS)).toBe(true);
      expect(rings.has(DOTMAN_MID_RADIUS)).toBe(true);
      expect(rings.has(DOTMAN_INNER_RADIUS)).toBe(true);
      expect(Math.round(radiusOf(pipe.points[0]!))).toBe(DOTMAN_OUTER_RADIUS);
      expect(Math.round(radiusOf(pipe.points.at(-1)!))).toBe(DOTMAN_INNER_RADIUS);
      expect(angleOf(pipe.points[0]!)).toBeCloseTo(-half, 0);
      expect(angleOf(pipe.points.at(-1)!)).toBeCloseTo(half, 0);
    }
  });

  it("widens every layer together when the mouth opens", () => {
    const closed = dotManMouthArt(DOTMAN_MOUTH_CLOSED_HALF_DEG).strands.find(
      (s) => s.id === "pipe",
    )!;
    const open = dotManMouthArt(DOTMAN_MOUTH_OPEN_HALF_DEG).strands.find((s) => s.id === "pipe")!;
    expect(Math.abs(angleOf(open.points[0]!))).toBeGreaterThan(
      Math.abs(angleOf(closed.points[0]!)),
    );
    expect(open.length).toBeLessThan(closed.length);
  });

  it("reuses one art per tenth of a degree", () => {
    expect(dotManMouthArt(48)).toBe(dotManMouthArt(48.04));
    expect(dotManMouthArt(16)).not.toBe(dotManMouthArt(48));
  });
});
