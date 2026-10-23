import { describe, expect, it } from "vitest";
import {
  SCARECROW_LINGER_BLINK_MS,
  SCARECROW_RADIUS_TILES,
  SCARECROW_WAVE_POINTS,
  addScentLingers,
  scentBlocksStep,
  scentLingerAlphaMul,
  scentRingAlpha,
  scentWavePoints,
  tickScentLingers,
} from "./scarecrow";

const zone = { col: 10, row: 10 };
const R = SCARECROW_RADIUS_TILES;

describe("scentBlocksStep", () => {
  it("blocks a step from outside into the radius", () => {
    expect(scentBlocksStep([zone], { col: 10 + R + 1, row: 10 }, { col: 10 + R, row: 10 }, R)).toBe(
      true,
    );
  });

  it("allows steps that stay outside", () => {
    expect(scentBlocksStep([zone], { col: 20, row: 10 }, { col: 19, row: 10 }, R)).toBe(false);
  });

  it("lets a ghost inside walk away but not deeper", () => {
    const inside = { col: 10 + 2, row: 10 };
    expect(scentBlocksStep([zone], inside, { col: 13, row: 10 }, R)).toBe(false);
    expect(scentBlocksStep([zone], inside, { col: 11, row: 10 }, R)).toBe(true);
  });

  it("blocks when any zone blocks", () => {
    const other = { col: 30, row: 10 };
    expect(scentBlocksStep([other, zone], { col: 15, row: 10 }, { col: 14, row: 10 }, R)).toBe(
      true,
    );
  });
});

describe("scent lingers", () => {
  it("expires after the duration", () => {
    const lingers = addScentLingers([], [zone], 5000);
    expect(tickScentLingers(lingers, 4999)).toHaveLength(1);
    expect(tickScentLingers(lingers, 5000)).toHaveLength(0);
  });

  it("blinks only in the last stretch", () => {
    expect(scentLingerAlphaMul(SCARECROW_LINGER_BLINK_MS + 1, 100)).toBe(1);
    expect(scentLingerAlphaMul(500, 0)).toBe(1);
    expect(scentLingerAlphaMul(500, 100)).toBeLessThan(1);
  });
});

describe("scentWavePoints", () => {
  it("wobbles around the ring radius and moves over time", () => {
    const a = scentWavePoints(0, 0, 64, 0, 0);
    const b = scentWavePoints(0, 0, 64, 0, 500);
    expect(a).toHaveLength(SCARECROW_WAVE_POINTS);
    expect(a[3]).not.toEqual(b[3]);
    for (const p of a) {
      expect(Math.hypot(p.x, p.y)).toBeGreaterThan(60);
      expect(Math.hypot(p.x, p.y)).toBeLessThan(68);
    }
  });

  it("fades inner rings", () => {
    expect(scentRingAlpha(2)).toBeLessThan(scentRingAlpha(0));
  });
});
