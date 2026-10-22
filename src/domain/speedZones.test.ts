import { describe, expect, it } from "vitest";
import {
  driftSpeedZones,
  FAST_ZONE_MULTIPLIER,
  pickSpeedZones,
  SLOW_ZONE_MULTIPLIER,
  SPEED_ZONE_END_DRIFT,
  SPEED_ZONE_MAX_LENGTH,
  SPEED_ZONE_MIN_GAP_TILES,
  SPEED_ZONE_MIN_LENGTH,
  speedZoneAt,
  speedZoneCells,
  speedZoneEffect,
  speedZoneGlowMask,
  speedZoneMultiplier,
  speedZoneCountForLevel,
  speedZoneParticles,
  type SpeedZoneDustSpeeds,
  speedZoneShift,
  speedZoneShiftFrame,
  speedZoneShiftSteps,
  speedZonesByLevel,
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

describe("speedZoneCountForLevel", () => {
  it("adds lanes from level 4: one, one, two, three, three", () => {
    expect([4, 5, 6, 7, 8].map(speedZoneCountForLevel)).toEqual([1, 1, 2, 3, 3]);
    for (const level of [1, 2, 3, 9]) {
      expect(speedZoneCountForLevel(level)).toBe(0);
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
    const speeds = { entryTilesPerSec: 0.5, exitTilesPerSec: 1 };
    const first = speedZoneParticles(lane, 0, speeds);
    const later = speedZoneParticles(lane, 50, speeds);
    expect(first).toHaveLength(lane.length * 2);
    expect(later.every((p, i) => p.col >= first[i]!.col || p.alpha < 0.05)).toBe(true);
    expect(new Set(first.map((p) => p.col.toFixed(3))).size).toBeGreaterThan(lane.length);
    const left = { ...lane, fastDir: "left" as const };
    const a = speedZoneParticles(left, 0, speeds);
    const b = speedZoneParticles(left, 50, speeds);
    expect(b.every((p, i) => p.col <= a[i]!.col || p.alpha < 0.05)).toBe(true);
  });

  const speedAlongLane = (speeds?: SpeedZoneDustSpeeds) => {
    const samples: { along: number; tilesPerSec: number }[] = [];
    for (let ms = 0; ms < 20000; ms += 37) {
      const to = speedZoneParticles(lane, ms + 10, speeds);
      speedZoneParticles(lane, ms, speeds).forEach((p, i) => {
        const delta = to[i]!.col - p.col;
        if (delta > 0) {
          samples.push({ along: (p.col - lane.col) / lane.length, tilesPerSec: delta / 0.01 });
        }
      });
    }
    return samples;
  };

  it("ramps dust speed evenly from the entry speed to the exit speed", () => {
    for (const speeds of [
      { entryTilesPerSec: 0.5, exitTilesPerSec: 4 },
      { entryTilesPerSec: 2, exitTilesPerSec: 2 },
    ]) {
      for (const { along, tilesPerSec } of speedAlongLane(speeds)) {
        const expected =
          speeds.entryTilesPerSec + (speeds.exitTilesPerSec - speeds.entryTilesPerSec) * along;
        expect(tilesPerSec / expected).toBeGreaterThan(0.98);
        expect(tilesPerSec / expected).toBeLessThan(1.12);
      }
    }
  });

  it("defaults to dust that crawls in and zips out", () => {
    const samples = speedAlongLane();
    const slowest = (xs: typeof samples) => Math.min(...xs.map((s) => s.tilesPerSec));
    const fastest = (xs: typeof samples) => Math.max(...xs.map((s) => s.tilesPerSec));
    const entering = samples.filter((s) => s.along < 0.1);
    const leaving = samples.filter((s) => s.along > 0.9);
    expect(fastest(entering)).toBeLessThan(1.5);
    expect(slowest(leaving)).toBeGreaterThan(6);
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
      const zones = pickSpeedZones(maze, lcg(seed), 2);
      expect(zones).toHaveLength(2);
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
      for (const zone of pickSpeedZones(blocked, lcg(seed), 2)) {
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
    expect(pickSpeedZones(tiny, lcg(1), 2)).toEqual([]);
  });
});

describe("persistent lanes", () => {
  const maze = board(24, 24, (c, r) => !(r % 6 === 1 || c % 6 === 1));
  const streams = (seed: number) => (level: number) => lcg(seed * 100 + level);

  function nearGap(a: SpeedZone, b: SpeedZone): boolean {
    return speedZoneCells(a).some((ca) =>
      speedZoneCells(b).some(
        (cb) =>
          Math.abs(ca.col - cb.col) < SPEED_ZONE_MIN_GAP_TILES &&
          Math.abs(ca.row - cb.row) < SPEED_ZONE_MIN_GAP_TILES,
      ),
    );
  }

  it("keeps existing lanes when adding new ones", () => {
    const first = pickSpeedZones(maze, lcg(3), 1);
    const more = pickSpeedZones(maze, lcg(4), 3, first);
    expect(more[0]).toEqual(first[0]);
    expect(more).toHaveLength(3);
  });

  it("drifts each end by at most the drift range, staying a valid, spaced lane", () => {
    const reach = Math.max(...SPEED_ZONE_END_DRIFT.map(Math.abs));
    for (let seed = 0; seed < 40; seed += 1) {
      const zones = pickSpeedZones(maze, lcg(seed), 3);
      const drifted = driftSpeedZones(maze, zones, lcg(seed + 1));
      drifted.forEach((zone, i) => {
        const before = zones[i]!;
        expect(zone.axis).toBe(before.axis);
        expect(zone.fastDir).toBe(before.fastDir);
        expect(zone.length).toBeGreaterThanOrEqual(SPEED_ZONE_MIN_LENGTH);
        expect(zone.length).toBeLessThanOrEqual(SPEED_ZONE_MAX_LENGTH);
        expect(
          Math.abs(zone.col - before.col) + Math.abs(zone.row - before.row),
        ).toBeLessThanOrEqual(reach);
        expect(Math.abs(zone.length - before.length)).toBeLessThanOrEqual(reach * 2);
        for (const cell of speedZoneCells(zone)) {
          expect(maze.playerSolids[cell.row]![cell.col]).toBe(false);
        }
        drifted.forEach((other, j) => {
          if (j !== i) {
            expect(nearGap(zone, other)).toBe(false);
          }
        });
      });
    }
  });

  it("grows on average across levels", () => {
    let growth = 0;
    for (let seed = 0; seed < 60; seed += 1) {
      const zones = pickSpeedZones(maze, lcg(seed), 3);
      const drifted = driftSpeedZones(maze, zones, lcg(seed + 7));
      growth += drifted.reduce((sum, z, i) => sum + z.length - zones[i]!.length, 0);
    }
    expect(growth).toBeGreaterThan(0);
  });

  it("replays the same lanes for a level and carries them from the previous level", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const byLevel = speedZonesByLevel(maze, 9, streams(seed)).slice(3);
      expect(byLevel.map((zones) => zones.length)).toEqual([0, 1, 1, 2, 3, 3, 0]);
      expect(speedZonesByLevel(maze, 7, streams(seed))[7]).toEqual(byLevel[4]);
      for (let i = 2; i <= 5; i += 1) {
        const prev = byLevel[i - 1]!;
        byLevel[i]!.slice(0, prev.length).forEach((zone, j) => {
          expect(zone.axis).toBe(prev[j]!.axis);
          expect(zone.fastDir).toBe(prev[j]!.fastDir);
          expect(
            speedZoneCells(zone).some((c) => speedZoneAt(prev, c.col, c.row) === prev[j]),
          ).toBe(true);
        });
      }
    }
  });
});

describe("speedZoneShift", () => {
  const before: SpeedZone = { col: 4, row: 3, axis: "horizontal", length: 9, fastDir: "left" };
  const after: SpeedZone = { ...before, col: 6, length: 9 };
  const added: SpeedZone = { col: 2, row: 8, axis: "vertical", length: 10, fastDir: "up" };

  it("moves each end one tile per step and grows a new lane out from its middle", () => {
    const shift = speedZoneShift([before], [after, added]);
    expect(speedZoneShiftSteps(shift)).toBe(5);
    expect(speedZoneShiftFrame(shift, 0)).toEqual([before]);
    expect(speedZoneShiftFrame(shift, 1)).toEqual([
      { ...before, col: 5, length: 9 },
      { ...added, row: 12, length: 2 },
    ]);
    expect(speedZoneShiftFrame(shift, 5)).toEqual([after, added]);
    expect(speedZoneShiftFrame(shift, 99)).toEqual([after, added]);
  });

  it("has no steps when nothing changed", () => {
    expect(speedZoneShiftSteps(speedZoneShift([before], [before]))).toBe(0);
    expect(speedZoneShiftSteps(speedZoneShift([], []))).toBe(0);
  });
});
