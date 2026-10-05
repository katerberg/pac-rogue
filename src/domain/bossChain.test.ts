import { describe, expect, it } from "vitest";
import {
  chainHitsCircle,
  chainPathCells,
  chainPolyline,
  distanceToPolyline,
  distanceToSegment,
  lightningPoints,
} from "./bossChain";
import { cellCenterX, cellCenterY } from "./maze";

const seg = { x1: 0, y1: 0, x2: 100, y2: 0 };
const line = {
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ],
};

const grid = (ascii: string) => ascii.split("\n").map((line) => [...line].map((ch) => ch === "#"));

const BEND = grid(`.#.
...
###`);

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

describe("chainPathCells", () => {
  it("routes an L-bend around a wall instead of through it", () => {
    expect(chainPathCells(BEND, 0, 0, 2, 0)).toEqual([
      { col: 0, row: 0 },
      { col: 0, row: 1 },
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 2, row: 0 },
    ]);
  });

  it("returns a single cell when start and end match", () => {
    expect(chainPathCells(BEND, 0, 0, 0, 0)).toEqual([{ col: 0, row: 0 }]);
  });

  it("returns null when the end is sealed", () => {
    const sealed = grid(`.#.
###`);
    expect(chainPathCells(sealed, 0, 0, 2, 0)).toBeNull();
  });
});

describe("chainPolyline", () => {
  it("pins ends to ghost pixels and puts intermediates on cell centers", () => {
    const x1 = cellCenterX(0) - 3;
    const y1 = cellCenterY(0) + 2;
    const x2 = cellCenterX(2) + 4;
    const y2 = cellCenterY(0) - 1;
    const points = chainPolyline(x1, y1, x2, y2, BEND);
    expect(points[0]).toEqual({ x: x1, y: y1 });
    expect(points.at(-1)).toEqual({ x: x2, y: y2 });
    expect(points.slice(1, -1)).toEqual([
      { x: cellCenterX(0), y: cellCenterY(1) },
      { x: cellCenterX(1), y: cellCenterY(1) },
      { x: cellCenterX(2), y: cellCenterY(1) },
    ]);
  });

  it("falls back to the straight chord when unreachable", () => {
    const sealed = grid(`.#.
###`);
    const points = chainPolyline(
      cellCenterX(0),
      cellCenterY(0),
      cellCenterX(2),
      cellCenterY(0),
      sealed,
    );
    expect(points).toEqual([
      { x: cellCenterX(0), y: cellCenterY(0) },
      { x: cellCenterX(2), y: cellCenterY(0) },
    ]);
  });
});

describe("chainHitsCircle", () => {
  it("hits when the circle's center is within half its radius of the chain", () => {
    expect(chainHitsCircle(line, 50, 4, 8)).toBe(true);
    expect(chainHitsCircle(line, 50, 5, 8)).toBe(false);
  });

  it("misses past the chain's ends", () => {
    expect(chainHitsCircle(line, 110, 0, 8)).toBe(false);
  });

  it("hits a hallway bend and misses the through-wall chord", () => {
    const x1 = cellCenterX(0);
    const y1 = cellCenterY(0);
    const x2 = cellCenterX(2);
    const y2 = cellCenterY(0);
    const path = { points: chainPolyline(x1, y1, x2, y2, BEND) };
    const onBend = { x: cellCenterX(1), y: cellCenterY(1) };
    const onChord = { x: cellCenterX(1), y: cellCenterY(0) };
    expect(distanceToPolyline(onBend.x, onBend.y, path.points)).toBeLessThan(1);
    expect(chainHitsCircle(path, onBend.x, onBend.y, 8)).toBe(true);
    expect(chainHitsCircle(path, onChord.x, onChord.y, 8)).toBe(false);
    expect(
      chainHitsCircle(
        {
          points: [
            { x: x1, y: y1 },
            { x: x2, y: y2 },
          ],
        },
        onChord.x,
        onChord.y,
        8,
      ),
    ).toBe(true);
  });
});

describe("lightningPoints", () => {
  it("pins both ends to the ghosts and keeps the bolt within the amplitude", () => {
    const points = lightningPoints(line, 1234, 6);
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 100, y: 0 });
    expect(points.length).toBeGreaterThan(5);
    for (const point of points) {
      expect(Math.abs(point.y)).toBeLessThanOrEqual(6);
    }
    expect(points.some((point) => Math.abs(point.y) > 0.5)).toBe(true);
  });

  it("holds a shape within a flicker frame and changes it on the next", () => {
    expect(lightningPoints(line, 1000, 6)).toEqual(lightningPoints(line, 1010, 6));
    expect(lightningPoints(line, 1000, 6)).not.toEqual(lightningPoints(line, 1100, 6));
    expect(lightningPoints(line, 1000, 6, 1)).not.toEqual(lightningPoints(line, 1000, 6, 0));
  });

  it("pins first and last points of a polyline path", () => {
    const path = {
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 40 },
        { x: 40, y: 40 },
      ],
    };
    const bolt = lightningPoints(path, 1234, 4);
    expect(bolt[0]).toEqual({ x: 0, y: 0 });
    expect(bolt.at(-1)).toEqual({ x: 40, y: 40 });
  });
});
