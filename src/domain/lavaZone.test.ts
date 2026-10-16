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

const NONE = { tunnelRows: [], cells: [] };

function centers(zones: readonly LavaZone[]): string[] {
  return zones.map((z) => `${z.col},${z.row}`).sort();
}

describe("lavaZoneCandidates", () => {
  it("centres only on straight hallway cells clear of intersections within max reach", () => {
    expect(centers(lavaZoneCandidates(board(), NONE))).toEqual(
      ["1,2", "10,1", "11,1", "19,2", "9,1"].sort(),
    );
  });

  it("keeps every lava cell off tunnel rows", () => {
    expect(centers(lavaZoneCandidates(board(), { tunnelRows: [3], cells: [] }))).toEqual([
      "10,1",
      "11,1",
      "9,1",
    ]);
  });

  it("keeps every lava cell off avoided cells such as speed lanes", () => {
    const lane = [
      { col: 13, row: 1 },
      { col: 14, row: 1 },
    ];
    expect(centers(lavaZoneCandidates(board(), { tunnelRows: [], cells: lane }))).toEqual(
      ["1,2", "19,2", "9,1"].sort(),
    );
  });

  it("spreads along the corridor, around a corner, from the centre", () => {
    const zone = lavaZoneCandidates(board(), NONE).find((z) => z.col === 1 && z.row === 2)!;
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
    expect(pickLavaZone(board(), NONE, () => 0)).toMatchObject({ col: 9, row: 1 });
    const open = board();
    open.playerSolids = open.playerSolids.map((row) => row.map(() => false));
    expect(pickLavaZone(open, NONE, () => 0)).toBeNull();
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

  it("flashes the bed only while warning", () => {
    expect(lavaFlashOn(1000)).toBe(false);
    expect(lavaFlashOn(5500)).toBe(true);
    expect(lavaFlashOn(5750)).toBe(false);
    expect(lavaFlashOn(6000)).toBe(true);
    expect(lavaFlashOn(8000)).toBe(false);
  });
});

describe("lavaSignedDistancePx", () => {
  const straight = lavaZoneCandidates(board(), NONE).find((z) => z.col === 10 && z.row === 1)!;
  const cornered = lavaZoneCandidates(board(), NONE).find((z) => z.col === 1 && z.row === 2)!;
  const at = (zone: LavaZone, reach: number, col: number, row: number, u: number, v: number) =>
    lavaSignedDistancePx(
      zone,
      reach,
      cellOriginX(col) + u * TILE_SIZE,
      cellOriginY(row) + v * TILE_SIZE,
    )!;
  const coveredTiles = (reach: number) => {
    let covered = 0;
    for (let x = cellOriginX(5); x < cellOriginX(16); x += 0.25) {
      const d = lavaSignedDistancePx(straight, reach, x, cellCenterY(1));
      covered += d !== null && d > 0 ? 0.25 : 0;
    }
    return covered / TILE_SIZE;
  };

  it("grows from the centre cell outward to max reach", () => {
    expect(coveredTiles(0)).toBe(0);
    expect(coveredTiles(0.25)).toBeCloseTo(0.5, 1);
    expect(coveredTiles(1)).toBeCloseTo(2, 1);
    expect(coveredTiles(LAVA_MAX_REACH_TILES)).toBeCloseTo(LAVA_MAX_REACH_TILES * 2, 1);
  });

  it("fills a straight cell from the edge nearest the centre, in px behind the front", () => {
    expect(at(straight, 1, 9, 1, 0.75, 0.5)).toBeGreaterThan(0);
    expect(at(straight, 1, 9, 1, 0.25, 0.5)).toBeLessThan(0);
    expect(at(straight, 1, 11, 1, 0.25, 0.5)).toBeCloseTo(TILE_SIZE / 4);
    expect(lavaSignedDistancePx(straight, 1, cellCenterX(14), cellCenterY(1))).toBeNull();
  });

  it("has no front inside cells the lava has already passed through", () => {
    expect(at(straight, LAVA_MAX_REACH_TILES, 11, 1, 0.95, 0.5)).toBe(Infinity);
    expect(at(straight, LAVA_MAX_REACH_TILES, 13, 1, 0.95, 0.5)).toBeCloseTo(0.05 * TILE_SIZE);
  });

  it("sweeps a corner cell around its inside corner instead of sliding straight across", () => {
    expect(cornered.cells.find((c) => c.col === 1 && c.row === 1)!.turn).toEqual({ dx: 1, dy: 0 });
    expect(cornered.cells.find((c) => c.col === 2 && c.row === 1)!.turn).toBeNull();
    expect(at(cornered, 1, 1, 1, 0.1, 0.9)).toBeGreaterThan(0);
    expect(at(cornered, 1, 1, 1, 0.9, 0.6)).toBeLessThan(0);
    for (const [u, v] of [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.9, 0.9],
    ] as const) {
      expect(at(cornered, 1.5, 1, 1, u, v)).toBeGreaterThan(0);
    }
  });

  it("touches a circle that overlaps the lava, not one beside it", () => {
    const radius = TILE_SIZE / 2;
    const touches = (reach: number, col: number, dx = 0) =>
      lavaTouchesCircle(straight, reach, cellCenterX(col) + dx, cellCenterY(1), radius);
    expect(touches(0.25, 10)).toBe(true);
    expect(touches(0.25, 11)).toBe(false);
    expect(touches(LAVA_MAX_REACH_TILES, 13)).toBe(true);
    expect(touches(LAVA_MAX_REACH_TILES, 15)).toBe(false);
    expect(touches(0.02, 10, 3)).toBe(true);
    expect(touches(0, 10)).toBe(false);
  });
});
