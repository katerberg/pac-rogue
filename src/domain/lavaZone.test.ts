import { describe, expect, it } from "vitest";
import {
  isLavaZoneLevel,
  LAVA_CYCLE_MS,
  LAVA_MAX_REACH_TILES,
  lavaCracksFlashOn,
  lavaPhase,
  lavaReachTiles,
  lavaRects,
  lavaTouchesCircle,
  lavaZoneCandidates,
  pickLavaZone,
  type LavaZone,
  type LavaZoneBoard,
} from "./lavaZone";
import { cellCenterX, cellCenterY, cellOriginX, TILE_SIZE } from "./maze";

const ROWS = [
  "#####################",
  "#...................#",
  "#.###.#########.###.#",
  "#...................#",
  "#####################",
];

function board(): LavaZoneBoard {
  const playerSolids = ROWS.map((line) => [...line].map((ch) => ch === "#"));
  const none = ROWS.map((line) => [...line].map(() => false));
  return {
    cols: ROWS[0]!.length,
    rows: ROWS.length,
    playerSolids,
    house: none,
    door: none,
    playerSpawn: { col: 10, row: 3 },
  };
}

function centers(zones: readonly LavaZone[]): string[] {
  return zones.map((z) => `${z.col},${z.row}`).sort();
}

describe("lavaZoneCandidates", () => {
  it("centres only on straight hallway cells clear of intersections within max reach", () => {
    expect(centers(lavaZoneCandidates(board(), []))).toEqual(
      ["1,2", "10,1", "11,1", "19,2", "9,1"].sort(),
    );
  });

  it("keeps every lava cell off tunnel rows", () => {
    expect(centers(lavaZoneCandidates(board(), [3]))).toEqual(["10,1", "11,1", "9,1"]);
  });

  it("spreads along the corridor, around a corner, from the centre", () => {
    const zone = lavaZoneCandidates(board(), []).find((z) => z.col === 1 && z.row === 2)!;
    expect(zone.cells.map((c) => [c.col, c.row, c.distance])).toEqual([
      [1, 2, 0],
      [1, 3, 1],
      [1, 1, 1],
      [2, 3, 2],
      [2, 1, 2],
      [3, 3, 3],
      [3, 1, 3],
    ]);
  });

  it("picks a seeded candidate and none on a board without hallways", () => {
    expect(pickLavaZone(board(), [], () => 0)).toMatchObject({ col: 9, row: 1 });
    const open = board();
    open.playerSolids = open.playerSolids.map((row) => row.map(() => false));
    expect(pickLavaZone(open, [], () => 0)).toBeNull();
  });
});

describe("lava cycle", () => {
  it("is level 8 only", () => {
    expect([7, 8, 9].map(isLavaZoneLevel)).toEqual([false, true, false]);
  });

  it("waits, warns, creeps out over 3s, holds 4s, retracts over 2s, and repeats", () => {
    const at = (ms: number) => [lavaPhase(ms), lavaReachTiles(ms)];
    expect(at(0)).toEqual(["dormant", 0]);
    expect(at(5600)).toEqual(["warn", 0]);
    expect(at(7000)).toEqual(["emerging", 0]);
    expect(at(8500)).toEqual(["emerging", LAVA_MAX_REACH_TILES / 2]);
    expect(at(10_000)).toEqual(["full", LAVA_MAX_REACH_TILES]);
    expect(at(13_999)).toEqual(["full", LAVA_MAX_REACH_TILES]);
    expect(at(15_000)).toEqual(["retracting", LAVA_MAX_REACH_TILES / 2]);
    expect(LAVA_CYCLE_MS).toBe(16_000);
    expect(at(LAVA_CYCLE_MS + 8500)).toEqual(["emerging", LAVA_MAX_REACH_TILES / 2]);
  });

  it("flashes the cracks only while warning", () => {
    expect(lavaCracksFlashOn(1000)).toBe(false);
    expect(lavaCracksFlashOn(5500)).toBe(true);
    expect(lavaCracksFlashOn(5750)).toBe(false);
    expect(lavaCracksFlashOn(6000)).toBe(true);
    expect(lavaCracksFlashOn(8000)).toBe(false);
  });
});

describe("lavaRects", () => {
  const zone = lavaZoneCandidates(board(), []).find((z) => z.col === 10 && z.row === 1)!;
  const width = (reach: number) =>
    lavaRects(zone, reach).reduce((sum, r) => sum + r.width, 0) / TILE_SIZE;

  it("grows from the centre cell outward to max reach", () => {
    expect(lavaRects(zone, 0)).toEqual([]);
    expect(width(0.25)).toBeCloseTo(0.5);
    expect(width(1)).toBeCloseTo(2);
    expect(width(LAVA_MAX_REACH_TILES)).toBeCloseTo(LAVA_MAX_REACH_TILES * 2);
  });

  it("fills a neighbour from the edge nearest the centre", () => {
    const left = lavaRects(zone, 1).find((r) => r.x < cellOriginX(10))!;
    expect(left.x).toBeCloseTo(cellOriginX(9) + TILE_SIZE / 2);
    expect(left.x + left.width).toBeCloseTo(cellOriginX(10));
  });

  it("marks the outermost span of each branch as the leading edge", () => {
    const fronts = (reach: number) =>
      lavaRects(zone, reach)
        .filter((r) => r.front)
        .map((r) => r.dx);
    expect(fronts(0.25).sort()).toEqual([-1, 1]);
    expect(fronts(1).sort()).toEqual([-1, 1]);
    expect(lavaRects(zone, 1).filter((r) => !r.front)).toHaveLength(2);
  });

  it("touches a circle that overlaps the lava, not one beside it", () => {
    const radius = TILE_SIZE / 2;
    const rects = lavaRects(zone, 0.25);
    expect(lavaTouchesCircle(rects, cellCenterX(10), cellCenterY(1), radius)).toBe(true);
    expect(lavaTouchesCircle(rects, cellCenterX(11), cellCenterY(1), radius)).toBe(false);
    expect(lavaTouchesCircle(lavaRects(zone, 1.5), cellCenterX(11), cellCenterY(1), radius)).toBe(
      true,
    );
    expect(lavaTouchesCircle(rects, cellCenterX(12), cellCenterY(1), radius)).toBe(false);
  });
});
