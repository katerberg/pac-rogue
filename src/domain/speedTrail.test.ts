import { describe, expect, it } from "vitest";
import { speedTrailSprites, tickSpeedTrail, type SpeedTrail } from "./speedTrail";

function run(points: readonly { x: number; y: number }[], deltaMs: number): SpeedTrail {
  let trail: SpeedTrail = [];
  for (const point of points) {
    trail = tickSpeedTrail(trail, point, deltaMs);
  }
  return trail;
}

describe("speedTrail", () => {
  it("draws fainter afterimages farther behind a moving player", () => {
    const trail = run(
      Array.from({ length: 12 }, (_, i) => ({ x: i * 10, y: 5 })),
      20,
    );
    const sprites = speedTrailSprites(trail, 50);
    expect(sprites).toHaveLength(2);
    expect(sprites[0]).toEqual({ x: 85, y: 5, alpha: 0.4 });
    expect(sprites[1]).toEqual({ x: 60, y: 5, alpha: 0.2 });
  });

  it("keeps only the history the trail needs", () => {
    const trail = run(
      Array.from({ length: 40 }, (_, i) => ({ x: i, y: 0 })),
      20,
    );
    expect(trail.length).toBeLessThanOrEqual(7);
  });

  it("draws nothing until enough history exists or while standing still", () => {
    expect(speedTrailSprites([], 50)).toEqual([]);
    expect(
      speedTrailSprites(
        run(
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          20,
        ),
        50,
      ),
    ).toEqual([]);
    expect(speedTrailSprites(run(Array(10).fill({ x: 3, y: 3 }), 20), 50)).toEqual([]);
  });

  it("stops the trail at a wrap or warp jump", () => {
    const points = [
      ...Array.from({ length: 6 }, (_, i) => ({ x: 400 + i * 10, y: 0 })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: i * 10, y: 0 })),
    ];
    expect(speedTrailSprites(run(points, 20), 50)).toEqual([{ x: 5, y: 0, alpha: 0.4 }]);
    expect(speedTrailSprites(run(points.slice(0, -1), 20), 50)).toEqual([]);
  });
});
