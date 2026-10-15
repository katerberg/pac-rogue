import { describe, expect, it } from "vitest";
import {
  FAST_ZONE_MULTIPLIER,
  isSpeedZoneLevel,
  pickSpeedZones,
  SLOW_ZONE_MULTIPLIER,
  SPEED_ZONE_SIZE,
  speedZoneAt,
  speedZoneHallwayCells,
  speedZoneOuterEdges,
  speedZoneMultiplier,
  type SpeedZone,
  type SpeedZoneBoard,
} from "./speedZones";

function grid(cols: number, rows: number, fill: (col: number, row: number) => boolean) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => fill(col, row)),
  );
}

function openBoard(cols = 12, rows = 12): SpeedZoneBoard {
  return {
    cols,
    rows,
    playerSolids: grid(cols, rows, () => false),
    house: grid(cols, rows, () => false),
    door: grid(cols, rows, () => false),
    playerSpawn: { col: 0, row: 0 },
  };
}

function cells(zone: SpeedZone): string[] {
  const out: string[] = [];
  for (let r = zone.row; r < zone.row + zone.size; r += 1) {
    for (let c = zone.col; c < zone.col + zone.size; c += 1) {
      out.push(`${c},${r}`);
    }
  }
  return out;
}

describe("isSpeedZoneLevel", () => {
  it("is true only for levels 5 through 8", () => {
    for (const level of [5, 6, 7, 8]) {
      expect(isSpeedZoneLevel(level)).toBe(true);
    }
    for (const level of [1, 2, 3, 4, 9]) {
      expect(isSpeedZoneLevel(level)).toBe(false);
    }
  });
});

describe("speedZoneMultiplier", () => {
  it("slows, speeds up or leaves the player alone", () => {
    expect(speedZoneMultiplier("slow")).toBe(SLOW_ZONE_MULTIPLIER);
    expect(speedZoneMultiplier("fast")).toBe(FAST_ZONE_MULTIPLIER);
    expect(speedZoneMultiplier(null)).toBe(1);
    expect(SLOW_ZONE_MULTIPLIER).toBeLessThan(1);
    expect(FAST_ZONE_MULTIPLIER).toBeGreaterThan(1);
  });
});

describe("speedZoneAt", () => {
  const zones: SpeedZone[] = [
    { kind: "slow", col: 2, row: 3, size: 4 },
    { kind: "fast", col: 8, row: 8, size: 4 },
  ];

  it("covers exactly the 4x4 square", () => {
    expect(speedZoneAt(zones, 2, 3)).toBe("slow");
    expect(speedZoneAt(zones, 5, 6)).toBe("slow");
    expect(speedZoneAt(zones, 6, 6)).toBeNull();
    expect(speedZoneAt(zones, 1, 3)).toBeNull();
    expect(speedZoneAt(zones, 11, 11)).toBe("fast");
    expect(speedZoneAt([], 2, 3)).toBeNull();
  });
});

describe("speedZoneHallwayCells", () => {
  it("lists only the walkable cells inside the zone", () => {
    const solids = grid(6, 6, (c, r) => !(r === 2 || c === 3));
    const zone: SpeedZone = { kind: "fast", col: 1, row: 1, size: 4 };
    expect(speedZoneHallwayCells(zone, solids)).toEqual([
      { col: 3, row: 1 },
      { col: 1, row: 2 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      { col: 4, row: 2 },
      { col: 3, row: 3 },
      { col: 3, row: 4 },
    ]);
  });
});

describe("speedZoneOuterEdges", () => {
  it("lists every cell side that does not touch another zone cell", () => {
    const cells = [
      { col: 1, row: 1 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
    ];
    expect(speedZoneOuterEdges(cells)).toEqual([
      { col: 1, row: 1, side: "up" },
      { col: 1, row: 1, side: "down" },
      { col: 1, row: 1, side: "left" },
      { col: 2, row: 1, side: "up" },
      { col: 2, row: 1, side: "right" },
      { col: 2, row: 2, side: "down" },
      { col: 2, row: 2, side: "left" },
      { col: 2, row: 2, side: "right" },
    ]);
  });

  it("has no edges without cells", () => {
    expect(speedZoneOuterEdges([])).toEqual([]);
  });
});

describe("pickSpeedZones", () => {
  it("drops one 4x4 slow zone and one 4x4 fast zone that do not overlap", () => {
    for (let seed = 0; seed < 50; seed += 1) {
      let n = seed;
      const zones = pickSpeedZones(openBoard(), () => (n = (n * 9301 + 49297) % 233280) / 233280);
      expect(zones.map((z) => z.kind)).toEqual(["slow", "fast"]);
      for (const zone of zones) {
        expect(zone.size).toBe(SPEED_ZONE_SIZE);
        expect(zone.col + zone.size).toBeLessThanOrEqual(12);
        expect(zone.row + zone.size).toBeLessThanOrEqual(12);
      }
      const slow = new Set(cells(zones[0]!));
      expect(cells(zones[1]!).some((cell) => slow.has(cell))).toBe(false);
    }
  });

  it("keeps zones off the ghost house, door and player spawn", () => {
    const board = openBoard();
    board.house = grid(12, 12, (c, r) => c >= 4 && c < 8 && r >= 4 && r < 6);
    board.door = grid(12, 12, (c, r) => c === 5 && r === 3);
    board.playerSpawn = { col: 6, row: 9 };
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      for (const zone of pickSpeedZones(board, () => r)) {
        for (const cell of cells(zone)) {
          const [c, row] = cell.split(",").map(Number) as [number, number];
          expect(board.house[row]![c]).toBe(false);
          expect(board.door[row]![c]).toBe(false);
          expect(c === 6 && row === 9).toBe(false);
        }
      }
    }
  });

  it("skips squares that are mostly wall", () => {
    const board = openBoard(8, 4);
    board.playerSolids = grid(8, 4, (c, r) => !(c >= 6 && r < 3));
    const zones = pickSpeedZones(board, () => 0);
    expect(zones).toEqual([{ kind: "slow", col: 4, row: 0, size: 4 }]);
  });

  it("returns no zones when nothing fits", () => {
    const board = openBoard(3, 3);
    expect(pickSpeedZones(board, () => 0)).toEqual([]);
  });
});
