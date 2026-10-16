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

const ROWS = ["###########", "#.........#", "#.###.###.#", "#.........#", "###########"];

function board(): LavaZoneBoard {
  const playerSolids = ROWS.map((line) => [...line].map((ch) => ch === "#"));
  const none = ROWS.map((line) => [...line].map(() => false));
  return {
    cols: ROWS[0]!.length,
    rows: ROWS.length,
    playerSolids,
    house: none,
    door: none,
    playerSpawn: { col: 5, row: 3 },
  };
}

function centers(zones: readonly LavaZone[]): string[] {
  return zones.map((z) => `${z.col},${z.row}`).sort();
}

describe("lavaZoneCandidates", () => {
  it("centres only on straight hallway cells at least 2 tiles from an intersection", () => {
    expect(centers(lavaZoneCandidates(board(), []))).toEqual(
      ["1,2", "2,1", "2,3", "3,1", "3,3", "7,1", "7,3", "8,1", "8,3", "9,2"].sort(),
    );
  });

  it("keeps every lava cell off tunnel rows", () => {
    expect(centers(lavaZoneCandidates(board(), [3]))).toEqual(["2,1", "3,1", "7,1", "8,1"]);
  });

  it("spreads along the corridor, around a corner, from the centre", () => {
    const zone = lavaZoneCandidates(board(), []).find((z) => z.col === 2 && z.row === 1)!;
    expect(zone.cells.map((c) => [c.col, c.row, c.distance])).toEqual([
      [2, 1, 0],
      [3, 1, 1],
      [1, 1, 1],
    ]);
  });

  it("picks a seeded candidate and none on a board without hallways", () => {
    expect(pickLavaZone(board(), [], () => 0)).toMatchObject({ col: 2, row: 1 });
    const open = board();
    open.playerSolids = open.playerSolids.map((row) => row.map(() => false));
    expect(pickLavaZone(open, [], () => 0)).toBeNull();
  });
});

describe("lava cycle", () => {
  it("is level 8 only", () => {
    expect([7, 8, 9].map(isLavaZoneLevel)).toEqual([false, true, false]);
  });

  it("waits, warns, creeps out over 5s, holds 2s, retracts over 5s, and repeats", () => {
    const at = (ms: number) => [lavaPhase(ms), lavaReachTiles(ms)];
    expect(at(0)).toEqual(["dormant", 0]);
    expect(at(3600)).toEqual(["warn", 0]);
    expect(at(5000)).toEqual(["emerging", 0]);
    expect(at(7500)).toEqual(["emerging", LAVA_MAX_REACH_TILES / 2]);
    expect(at(10_000)).toEqual(["full", LAVA_MAX_REACH_TILES]);
    expect(at(11_999)).toEqual(["full", LAVA_MAX_REACH_TILES]);
    expect(at(14_500)).toEqual(["retracting", LAVA_MAX_REACH_TILES / 2]);
    expect(LAVA_CYCLE_MS).toBe(17_000);
    expect(at(LAVA_CYCLE_MS + 7500)).toEqual(["emerging", LAVA_MAX_REACH_TILES / 2]);
  });

  it("flashes the cracks only while warning", () => {
    expect(lavaCracksFlashOn(1000)).toBe(false);
    expect(lavaCracksFlashOn(4000)).toBe(true);
    expect(lavaCracksFlashOn(4250)).toBe(false);
    expect(lavaCracksFlashOn(4500)).toBe(true);
    expect(lavaCracksFlashOn(6000)).toBe(false);
  });
});

describe("lavaRects", () => {
  const zone = lavaZoneCandidates(board(), []).find((z) => z.col === 3 && z.row === 1)!;
  const width = (reach: number) =>
    lavaRects(zone, reach).reduce((sum, r) => sum + r.width, 0) / TILE_SIZE;

  it("grows from the centre cell outward to 3 tiles", () => {
    expect(lavaRects(zone, 0)).toEqual([]);
    expect(width(0.25)).toBeCloseTo(0.5);
    expect(width(1)).toBeCloseTo(2);
    expect(width(LAVA_MAX_REACH_TILES)).toBeCloseTo(3);
  });

  it("fills a neighbour from the edge nearest the centre", () => {
    const left = lavaRects(zone, 1).find((r) => r.x < cellOriginX(3))!;
    expect(left.x).toBeCloseTo(cellOriginX(2) + TILE_SIZE / 2);
    expect(left.x + left.width).toBeCloseTo(cellOriginX(3));
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
    expect(lavaTouchesCircle(rects, cellCenterX(3), cellCenterY(1), radius)).toBe(true);
    expect(lavaTouchesCircle(rects, cellCenterX(4), cellCenterY(1), radius)).toBe(false);
    expect(lavaTouchesCircle(lavaRects(zone, 1.5), cellCenterX(4), cellCenterY(1), radius)).toBe(
      true,
    );
    expect(lavaTouchesCircle(rects, cellCenterX(5), cellCenterY(1), radius)).toBe(false);
  });
});
