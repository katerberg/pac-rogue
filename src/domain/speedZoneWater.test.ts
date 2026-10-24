import { describe, expect, it } from "vitest";
import type { SpeedZone } from "./speedZones";
import {
  DEFAULT_SPEED_ZONE_FLOW_SPEEDS,
  flowProfile,
  paintSpeedZoneWater,
  SPEED_ZONE_WATER_ART_TILE,
  SPEED_ZONE_WATER_STYLE,
  speedZoneWaterCanvas,
  speedZoneWaterMask,
  stepWakeDroplets,
  wakePixels,
  type WakeRider,
} from "./speedZoneWater";

const ART = SPEED_ZONE_WATER_ART_TILE;
const lane: SpeedZone = { col: 5, row: 4, axis: "horizontal", length: 6, fastDir: "right" };
const INSET = 7;
const REACH = INSET - SPEED_ZONE_WATER_STYLE.wallGapPx;

function board(open: (col: number, row: number) => boolean) {
  const grid = (fill: (col: number, row: number) => boolean) =>
    Array.from({ length: 16 }, (_, row) => Array.from({ length: 20 }, (_, col) => fill(col, row)));
  return {
    walls: grid((col, row) => !open(col, row)),
    house: grid(() => false),
    door: grid(() => false),
  };
}

const corridorRow = board((_col, row) => row === lane.row);

function painted(zone: SpeedZone, nowMs: number, open = corridorRow) {
  const canvas = speedZoneWaterCanvas(zone);
  paintSpeedZoneWater(
    canvas,
    zone,
    nowMs,
    DEFAULT_SPEED_ZONE_FLOW_SPEEDS,
    speedZoneWaterMask(open, INSET),
  );
  const alphaAt = (bx: number, by: number) =>
    canvas.rgba[((by - canvas.y) * canvas.width + (bx - canvas.x)) * 4 + 3]!;
  const covered: { x: number; y: number }[] = [];
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (canvas.rgba[(y * canvas.width + x) * 4 + 3]! > 0) {
        covered.push({ x: canvas.x + x, y: canvas.y + y });
      }
    }
  }
  return { canvas, alphaAt, covered };
}

describe("flowProfile", () => {
  it("ramps speed evenly from entry to exit and inverts its own timing", () => {
    const profile = flowProfile(10, 1.4, 12);
    expect(profile.speed(0)).toBeCloseTo(1.4);
    expect(profile.speed(5)).toBeCloseTo(6.7);
    expect(profile.speed(10)).toBeCloseTo(12);
    for (const along of [0.5, 3, 9.5]) {
      expect(profile.alongAt(profile.timeTo(along))).toBeCloseTo(along);
    }
    expect(profile.alongAt(profile.crossingSec)).toBeCloseTo(10);
    expect(flowProfile(4, 2, 2).crossingSec).toBeCloseTo(2);
  });
});

describe("paintSpeedZoneWater", () => {
  it("fills the corridor out to just short of the wall lines", () => {
    const { alphaAt } = painted(lane, 1234);
    const midX = (lane.col + 3) * ART + 3;
    const top = lane.row * ART;
    expect(alphaAt(midX, top + ART / 2)).toBe(255);
    expect(alphaAt(midX, top - REACH)).toBe(255);
    expect(alphaAt(midX, top + ART + REACH - 1)).toBe(255);
    expect(alphaAt(midX, top - REACH - 1)).toBe(0);
    expect(alphaAt(midX, top + ART + REACH)).toBe(0);
  });

  it("sprays out of the fast end but never over walls", () => {
    for (const fastDir of ["right", "left"] as const) {
      const zone = { ...lane, fastDir };
      const beyond = new Set<number>();
      for (let ms = 0; ms < 2000; ms += 97) {
        for (const { x, y } of painted(zone, ms).covered) {
          expect(y).toBeGreaterThanOrEqual(lane.row * ART - REACH);
          expect(y).toBeLessThan((lane.row + 1) * ART + REACH);
          const outside =
            fastDir === "right" ? x - (lane.col + lane.length) * ART : lane.col * ART - 1 - x;
          const behind =
            fastDir === "right" ? lane.col * ART - 1 - x : x - (lane.col + lane.length) * ART;
          expect(behind).toBeLessThan(0);
          if (outside >= 0) {
            beyond.add(outside);
          }
        }
      }
      expect(Math.max(...beyond)).toBeGreaterThan(ART);
    }
  });

  it("keeps vertical lanes in their column", () => {
    const zone: SpeedZone = { col: 3, row: 2, axis: "vertical", length: 9, fastDir: "up" };
    const { covered } = painted(
      zone,
      800,
      board((col) => col === zone.col),
    );
    expect(covered.length).toBeGreaterThan(zone.length * ART * 20);
    expect(
      covered.every(({ x }) => x >= zone.col * ART - REACH && x < (zone.col + 1) * ART + REACH),
    ).toBe(true);
    expect(covered.some(({ y }) => y < zone.row * ART)).toBe(true);
  });

  it("is deterministic for a lane and time, and moves over time", () => {
    const a = painted(lane, 4321).canvas.rgba;
    expect(painted(lane, 4321).canvas.rgba).toEqual(a);
    expect(painted(lane, 4400).canvas.rgba).not.toEqual(a);
  });
});

describe("speedZoneWaterMask", () => {
  it("lets water onto corridor cells only, not walls, the ghost house or its door", () => {
    const mask = speedZoneWaterMask(
      {
        walls: [[true, false, false, false]],
        house: [[false, false, true, false]],
        door: [[false, false, false, true]],
      },
      0,
    );
    expect([0, 1, 2, 3, 9].map((col) => mask.isOpen(col * ART + 8, 8))).toEqual([
      false,
      true,
      false,
      false,
      false,
    ]);
  });

  it("lets the water mask reach into wall tiles up to the wall line, but not round corners", () => {
    const mask = speedZoneWaterMask(corridorRow, INSET);
    const top = lane.row * ART;
    expect(mask.halfWidthPx).toBe(ART / 2 + REACH);
    expect(mask.isOpen(40, top + 3)).toBe(true);
    expect(mask.isOpen(40, top - REACH)).toBe(true);
    expect(mask.isOpen(40, top - REACH - 1)).toBe(false);
    expect(mask.isOpen(40, top + ART + REACH - 1)).toBe(true);
    expect(mask.isOpen(40, top + ART + REACH)).toBe(false);
    expect(
      speedZoneWaterMask(
        board(() => false),
        INSET,
      ).isOpen(40, top),
    ).toBe(false);
  });
});

describe("wake droplets", () => {
  const RADIUS = 12;
  const rider = (effect: WakeRider["effect"]): WakeRider => ({
    x: 100,
    y: 50,
    dx: 1,
    dy: 0,
    effect,
  });

  it("throws spray behind Dot-Man riding the flow and ahead of him fighting it", () => {
    const behind = stepWakeDroplets([], rider("fast"), 0, 1000, RADIUS);
    const ahead = stepWakeDroplets([], rider("slow"), 0, 1000, RADIUS);
    expect(behind.length).toBeGreaterThan(0);
    expect(behind.every((d) => d.x < 100 && d.vx < 0)).toBe(true);
    expect(ahead.length).toBeGreaterThan(0);
    expect(ahead.every((d) => d.x > 100 + RADIUS && d.vx > 0)).toBe(true);
  });

  it("spawns at a steady rate, only for the last droplet lifetime, and lets them expire", () => {
    const perSec = SPEED_ZONE_WATER_STYLE.wakePerSec;
    const life = SPEED_ZONE_WATER_STYLE.wakeLifeMs;
    const oneFrame = stepWakeDroplets([], rider("fast"), 10000, 10100, RADIUS);
    expect(oneFrame.length).toBeGreaterThanOrEqual(Math.floor(perSec / 10));
    expect(oneFrame.length).toBeLessThanOrEqual(Math.ceil(perSec / 10));
    const longGap = stepWakeDroplets([], rider("fast"), 0, 60000, RADIUS);
    expect(longGap.length).toBeLessThanOrEqual(Math.ceil((perSec * life) / 1000));
    expect(stepWakeDroplets(oneFrame, null, 10100, 10100 + life, RADIUS)).toEqual([]);
    expect(stepWakeDroplets(oneFrame, null, 10100, 10150, RADIUS)).toEqual(oneFrame);
  });

  it("fades droplets like spray and drops ones over walls", () => {
    const droplets = stepWakeDroplets([], rider("fast"), 0, 1000, RADIUS);
    const open = () => true;
    const fresh = wakePixels(droplets, 1000, open);
    expect(fresh.length).toBe(droplets.length);
    expect(fresh.every((px) => px.alpha > 0 && px.alpha <= 1)).toBe(true);
    const newest = droplets.filter((d) => d.bornMs === 1000);
    expect(newest).toHaveLength(1);
    const life = SPEED_ZONE_WATER_STYLE.wakeLifeMs;
    const alphas = [0, 0.5, 0.9].map((f) => wakePixels(newest, 1000 + life * f, open)[0]!.alpha);
    expect(alphas[0]).toBe(1);
    expect(alphas[1]).toBeLessThan(alphas[0]!);
    expect(alphas[2]).toBeLessThan(alphas[1]!);
    expect(wakePixels(newest, 1000 + life, open)).toEqual([]);
    expect(wakePixels(droplets, 1000, () => false)).toEqual([]);
  });
});
