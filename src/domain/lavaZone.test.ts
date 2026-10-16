import { describe, expect, it } from "vitest";
import {
  isLavaZoneLevel,
  LAVA_CYCLE_MS,
  LAVA_MAX_REACH_TILES,
  lavaFlashOn,
  lavaPhase,
  lavaReachTiles,
  lavaSignedDistancePx,
  lavaTouchesCircle,
  lavaZoneCandidates,
  pickLavaZone,
  type LavaZone,
  type LavaZoneBoard,
} from "./lavaZone";
import { cellCenterX, cellCenterY, cellOriginX, cellOriginY, TILE_SIZE } from "./maze";

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

const NONE = { tunnelRows: [], cells: [] };

function centers(zones: readonly LavaZone[]): string[] {
  return zones.map((z) => `${z.col},${z.row}`).sort();
}

describe("lavaZoneCandidates", () => {
  it("centres only on straight hallway cells at least 2 tiles from an intersection", () => {
    expect(centers(lavaZoneCandidates(board(), NONE))).toEqual(
      ["1,2", "2,1", "2,3", "3,1", "3,3", "7,1", "7,3", "8,1", "8,3", "9,2"].sort(),
    );
  });

  it("keeps every lava cell off tunnel rows", () => {
    expect(centers(lavaZoneCandidates(board(), { tunnelRows: [3], cells: [] }))).toEqual([
      "2,1",
      "3,1",
      "7,1",
      "8,1",
    ]);
  });

  it("keeps every lava cell off avoided cells such as speed lanes", () => {
    const lane = [
      { col: 4, row: 1 },
      { col: 5, row: 1 },
      { col: 6, row: 1 },
    ];
    expect(centers(lavaZoneCandidates(board(), { tunnelRows: [], cells: lane }))).toEqual(
      ["1,2", "2,1", "2,3", "3,3", "7,3", "8,1", "8,3", "9,2"].sort(),
    );
  });

  it("spreads along the corridor, around a corner, from the centre", () => {
    const zone = lavaZoneCandidates(board(), NONE).find((z) => z.col === 2 && z.row === 1)!;
    expect(zone.cells.map((c) => [c.col, c.row, c.distance])).toEqual([
      [2, 1, 0],
      [3, 1, 1],
      [1, 1, 1],
    ]);
  });

  it("picks a seeded candidate and none on a board without hallways", () => {
    expect(pickLavaZone(board(), NONE, () => 0)).toMatchObject({ col: 2, row: 1 });
    const open = board();
    open.playerSolids = open.playerSolids.map((row) => row.map(() => false));
    expect(pickLavaZone(open, NONE, () => 0)).toBeNull();
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

  it("flashes the bed only while warning", () => {
    expect(lavaFlashOn(1000)).toBe(false);
    expect(lavaFlashOn(4000)).toBe(true);
    expect(lavaFlashOn(4250)).toBe(false);
    expect(lavaFlashOn(4500)).toBe(true);
    expect(lavaFlashOn(6000)).toBe(false);
  });
});

describe("lavaSignedDistancePx", () => {
  const straight = lavaZoneCandidates(board(), NONE).find((z) => z.col === 3 && z.row === 1)!;
  const cornered = lavaZoneCandidates(board(), NONE).find((z) => z.col === 2 && z.row === 1)!;
  const at = (zone: LavaZone, reach: number, col: number, row: number, u: number, v: number) =>
    lavaSignedDistancePx(
      zone,
      reach,
      cellOriginX(col) + u * TILE_SIZE,
      cellOriginY(row) + v * TILE_SIZE,
    )!;
  const coveredTiles = (reach: number) => {
    let covered = 0;
    for (let x = cellOriginX(1); x < cellOriginX(6); x += 0.25) {
      const d = lavaSignedDistancePx(straight, reach, x, cellCenterY(1));
      covered += d !== null && d > 0 ? 0.25 : 0;
    }
    return covered / TILE_SIZE;
  };

  it("grows from the centre cell outward to 3 tiles", () => {
    expect(coveredTiles(0)).toBe(0);
    expect(coveredTiles(0.25)).toBeCloseTo(0.5, 1);
    expect(coveredTiles(1)).toBeCloseTo(2, 1);
    expect(coveredTiles(LAVA_MAX_REACH_TILES)).toBeCloseTo(3, 1);
  });

  it("fills a straight neighbour from the edge nearest the centre, in px behind the front", () => {
    expect(at(straight, 1, 2, 1, 0.75, 0.5)).toBeGreaterThan(0);
    expect(at(straight, 1, 2, 1, 0.25, 0.5)).toBeLessThan(0);
    expect(at(straight, 1, 4, 1, 0.25, 0.5)).toBeCloseTo(TILE_SIZE / 4);
    expect(lavaSignedDistancePx(straight, 1, cellCenterX(6), cellCenterY(1))).toBeNull();
  });

  it("sweeps a corner cell around its inside corner instead of sliding straight across", () => {
    expect(cornered.cells.find((c) => c.col === 1)!.turn).toEqual({ dx: 0, dy: 1 });
    expect(at(cornered, 1, 1, 1, 0.9, 0.1)).toBeGreaterThan(0);
    expect(at(cornered, 1, 1, 1, 0.6, 0.9)).toBeLessThan(0);
    expect(at(cornered, 1, 1, 1, 0.1, 0.9)).toBeLessThan(0);
    for (const [u, v] of [
      [0.1, 0.1],
      [0.9, 0.9],
      [0.1, 0.9],
    ] as const) {
      expect(at(cornered, LAVA_MAX_REACH_TILES, 1, 1, u, v)).toBeGreaterThan(0);
    }
  });

  it("touches a circle that overlaps the lava, not one beside it", () => {
    const radius = TILE_SIZE / 2;
    expect(lavaTouchesCircle(straight, 0.25, cellCenterX(3), cellCenterY(1), radius)).toBe(true);
    expect(lavaTouchesCircle(straight, 0.25, cellCenterX(4), cellCenterY(1), radius)).toBe(false);
    expect(lavaTouchesCircle(straight, 1.5, cellCenterX(4), cellCenterY(1), radius)).toBe(true);
    expect(lavaTouchesCircle(straight, 1.5, cellCenterX(5), cellCenterY(1), radius)).toBe(false);
    expect(lavaTouchesCircle(straight, 0.02, cellCenterX(3) + 3, cellCenterY(1), radius)).toBe(
      true,
    );
    expect(lavaTouchesCircle(straight, 0, cellCenterX(3), cellCenterY(1), radius)).toBe(false);
  });
});
