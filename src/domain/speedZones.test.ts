import { describe, expect, it } from "vitest";
import {
  FAST_ZONE_MULTIPLIER,
  isSpeedZoneLevel,
  pickSpeedZones,
  SLOW_ZONE_MULTIPLIER,
  SPEED_ZONE_COUNT,
  SPEED_ZONE_MAX_LENGTH,
  SPEED_ZONE_MIN_GAP_TILES,
  SPEED_ZONE_MIN_LENGTH,
  speedZoneAt,
  speedZoneCells,
  speedZoneEffect,
  speedZoneGlowMask,
  speedZoneMultiplier,
  speedZoneParticles,
  type SpeedZone,
  type SpeedZoneBoard,
} from "./speedZones";

function grid(cols: number, rows: number, fill: (col: number, row: number) => boolean) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => fill(col, row)),
  );
}

function board(cols: number, rows: number, solid: (col: number, row: number) => boolean) {
  return {
    cols,
    rows,
    playerSolids: grid(cols, rows, solid),
    house: grid(cols, rows, () => false),
    door: grid(cols, rows, () => false),
    playerSpawn: { col: 0, row: 0 },
  } satisfies SpeedZoneBoard;
}

function lcg(seed: number): () => number {
  let n = seed;
  return () => (n = (n * 9301 + 49297) % 233280) / 233280;
}

const lane: SpeedZone = { col: 2, row: 3, axis: "horizontal", length: 4, fastDir: "right" };

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

describe("speedZoneCells / speedZoneAt", () => {
  it("lists a straight run of cells along the lane axis", () => {
    expect(speedZoneCells(lane)).toEqual([
      { col: 2, row: 3 },
      { col: 3, row: 3 },
      { col: 4, row: 3 },
      { col: 5, row: 3 },
    ]);
    expect(speedZoneCells({ ...lane, axis: "vertical", length: 3 })).toEqual([
      { col: 2, row: 3 },
      { col: 2, row: 4 },
      { col: 2, row: 5 },
    ]);
  });

  it("finds the lane covering a cell", () => {
    expect(speedZoneAt([lane], 5, 3)).toBe(lane);
    expect(speedZoneAt([lane], 6, 3)).toBeNull();
    expect(speedZoneAt([lane], 3, 4)).toBeNull();
  });
});

describe("speedZoneEffect", () => {
  it("is fast along the fast direction, slow against it, and neutral across", () => {
    expect(speedZoneEffect(lane, 140, 0)).toBe("fast");
    expect(speedZoneEffect(lane, -140, 0)).toBe("slow");
    expect(speedZoneEffect(lane, 0, 140)).toBeNull();
    expect(speedZoneEffect(lane, 0, 0)).toBeNull();
    const up: SpeedZone = { ...lane, axis: "vertical", fastDir: "up" };
    expect(speedZoneEffect(up, 0, -140)).toBe("fast");
    expect(speedZoneEffect(up, 0, 140)).toBe("slow");
  });

  it("maps effects to multipliers", () => {
    expect(speedZoneMultiplier("fast")).toBe(FAST_ZONE_MULTIPLIER);
    expect(speedZoneMultiplier("slow")).toBe(SLOW_ZONE_MULTIPLIER);
    expect(speedZoneMultiplier(null)).toBe(1);
  });
});

describe("speedZoneParticles", () => {
  it("drifts particles toward the fast end without a fixed cadence", () => {
    const first = speedZoneParticles(lane, 0);
    const later = speedZoneParticles(lane, 50);
    expect(first).toHaveLength(lane.length * 2);
    expect(later.every((p, i) => p.col >= first[i]!.col || p.alpha < 0.05)).toBe(true);
    expect(new Set(first.map((p) => p.col.toFixed(3))).size).toBeGreaterThan(lane.length);
    const left = { ...lane, fastDir: "left" as const };
    const a = speedZoneParticles(left, 0);
    const b = speedZoneParticles(left, 50);
    expect(b.every((p, i) => p.col <= a[i]!.col || p.alpha < 0.05)).toBe(true);
  });

  it("keeps every particle inside the lane, faint, and fading at the ends", () => {
    for (const zone of [lane, { ...lane, axis: "vertical" as const, fastDir: "up" as const }]) {
      const vertical = zone.axis === "vertical";
      for (const ms of [0, 130, 470, 999, 12345]) {
        for (const p of speedZoneParticles(zone, ms)) {
          const along = vertical ? p.row - zone.row : p.col - zone.col;
          const across = vertical ? p.col - zone.col : p.row - zone.row;
          expect(along).toBeGreaterThanOrEqual(0);
          expect(along).toBeLessThanOrEqual(zone.length);
          expect(across).toBeGreaterThan(0.1);
          expect(across).toBeLessThan(0.9);
          expect(p.alpha).toBeGreaterThanOrEqual(0);
          expect(p.alpha).toBeLessThanOrEqual(0.5);
        }
      }
    }
  });

  it("is deterministic for a lane and time", () => {
    expect(speedZoneParticles(lane, 777)).toEqual(speedZoneParticles(lane, 777));
  });
});

describe("speedZoneGlowMask", () => {
  const style = { tileSize: 10, reachPx: 6, fillAlpha: 0.5, glowPeakAlpha: 0.8 };
  const mask = speedZoneGlowMask(lane, style);
  const at = (x: number, y: number) => mask.alpha[y * mask.width + x]!;

  it("covers the lane padded by the glow reach", () => {
    expect(mask.width).toBe(4 * 10 + 12);
    expect(mask.height).toBe(10 + 12);
  });

  it("fills the lane body and fades with distance outside it", () => {
    expect(at(26, 11)).toBe(0.5);
    expect(at(26, 3)).toBeGreaterThan(at(26, 1));
    expect(at(0, 0)).toBe(0);
  });

  it("rounds the lane ends instead of squaring them", () => {
    const squareCorner = at(6, 6);
    const endMiddle = at(6, 11);
    expect(endMiddle).toBe(0.5);
    expect(squareCorner).toBeLessThan(0.5);
  });
});

describe("pickSpeedZones", () => {
  const maze = board(14, 14, (c, r) => !(r % 4 === 1 || c % 4 === 1));

  it("drops two straight lanes of 3-6 walkable tiles kept apart by the minimum gap", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const zones = pickSpeedZones(maze, lcg(seed));
      expect(zones).toHaveLength(SPEED_ZONE_COUNT);
      for (const zone of zones) {
        expect(zone.length).toBeGreaterThanOrEqual(SPEED_ZONE_MIN_LENGTH);
        expect(zone.length).toBeLessThanOrEqual(SPEED_ZONE_MAX_LENGTH);
        expect(zone.fastDir).toMatch(zone.axis === "horizontal" ? /left|right/ : /up|down/);
        for (const cell of speedZoneCells(zone)) {
          expect(maze.playerSolids[cell.row]![cell.col]).toBe(false);
          expect(cell.col).toBeGreaterThan(0);
          expect(cell.col).toBeLessThan(maze.cols - 1);
        }
      }
      const [a, b] = zones as [SpeedZone, SpeedZone];
      const near = speedZoneCells(a).some((ca) =>
        speedZoneCells(b).some(
          (cb) =>
            Math.abs(ca.col - cb.col) < SPEED_ZONE_MIN_GAP_TILES &&
            Math.abs(ca.row - cb.row) < SPEED_ZONE_MIN_GAP_TILES,
        ),
      );
      expect(near).toBe(false);
    }
  });

  it("never lays a lane on the ghost house, door or player spawn", () => {
    const blocked = {
      ...maze,
      house: grid(14, 14, (c, r) => r === 5 && c >= 4),
      door: grid(14, 14, (c, r) => r === 9 && c === 6),
      playerSpawn: { col: 3, row: 1 },
    };
    for (let seed = 0; seed < 40; seed += 1) {
      for (const zone of pickSpeedZones(blocked, lcg(seed))) {
        for (const cell of speedZoneCells(zone)) {
          expect(blocked.house[cell.row]![cell.col]).toBe(false);
          expect(blocked.door[cell.row]![cell.col]).toBe(false);
          expect(cell.col === 3 && cell.row === 1).toBe(false);
        }
      }
    }
  });

  it("returns no lanes when no straight run reaches three tiles", () => {
    const tiny = board(4, 4, (c, r) => !(r === 1 && c <= 2));
    expect(pickSpeedZones(tiny, lcg(1))).toEqual([]);
  });
});
