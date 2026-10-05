import { describe, expect, it } from "vitest";
import { chainHitsCircle, distanceToSegment, lightningPoints } from "./bossChain";

const seg = { x1: 0, y1: 0, x2: 100, y2: 0 };

describe("distanceToSegment", () => {
  it("measures to the nearest point on the segment, clamped to its ends", () => {
    expect(distanceToSegment(50, 7, seg)).toBe(7);
    expect(distanceToSegment(-3, 4, seg)).toBe(5);
    expect(distanceToSegment(103, -4, seg)).toBe(5);
  });

  it("handles a zero-length chain as a point", () => {
    expect(distanceToSegment(3, 4, { x1: 0, y1: 0, x2: 0, y2: 0 })).toBe(5);
  });
});

describe("chainHitsCircle", () => {
  it("hits when the circle's center is within half its radius of the chain", () => {
    expect(chainHitsCircle(seg, 50, 4, 8)).toBe(true);
    expect(chainHitsCircle(seg, 50, 5, 8)).toBe(false);
  });

  it("misses past the chain's ends", () => {
    expect(chainHitsCircle(seg, 110, 0, 8)).toBe(false);
  });
});

describe("lightningPoints", () => {
  it("pins both ends to the ghosts and keeps the bolt within the amplitude", () => {
    const points = lightningPoints(seg, 1234, 6);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 100, y: 0 });
    expect(points.length).toBeGreaterThan(5);
    for (const point of points) {
      expect(Math.abs(point.y)).toBeLessThanOrEqual(6);
    }
    expect(points.some((point) => Math.abs(point.y) > 0.5)).toBe(true);
  });

  it("holds a shape within a flicker frame and changes it on the next", () => {
    expect(lightningPoints(seg, 1000, 6)).toEqual(lightningPoints(seg, 1010, 6));
    expect(lightningPoints(seg, 1000, 6)).not.toEqual(lightningPoints(seg, 1100, 6));
    expect(lightningPoints(seg, 1000, 6, 1)).not.toEqual(lightningPoints(seg, 1000, 6, 0));
  });
});
