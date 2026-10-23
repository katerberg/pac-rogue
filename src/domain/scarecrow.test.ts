import { describe, expect, it } from "vitest";
import {
  SCARECROW_LINGER_BLINK_MS,
  SCARECROW_RADIUS_TILES,
  SCARECROW_BASE_ALPHA,
  SCARECROW_PIXEL_PX,
  addScentLingers,
  scentBlocksStep,
  scentLingerAlphaMul,
  scentCells,
  scentPixels,
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

describe("scent corridors", () => {
  const corridor = (col: number, row: number) => row === 10 && col >= 0 && col <= 30;

  it("spreads only along walkable cells inside the radius", () => {
    const cells = scentCells(zone, R, corridor);
    const cols = cells.map((cell) => cell.col).sort((a, b) => a - b);
    expect(cols).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14]);
    expect(cells.every((cell) => cell.row === 10)).toBe(true);
  });

  it("draws a wavy pixel line that moves over time and fades with distance", () => {
    const cells = scentCells(zone, R, corridor);
    const at = (t: number) => scentPixels(zone, cells, R, 16, 0, 0, t, corridor);
    const a = at(0);
    const b = at(500);
    expect(a.length).toBeGreaterThan(0);
    expect(
      a.every((px) => px.size === SCARECROW_PIXEL_PX && px.alpha <= SCARECROW_BASE_ALPHA),
    ).toBe(true);
    expect(new Set(a.map((px) => px.y)).size).toBeGreaterThan(1);
    expect(a.map((px) => px.y)).not.toEqual(b.map((px) => px.y));
    const near = a.find((px) => px.x > 10 * 16 && px.x < 11 * 16)!;
    const far = a.find((px) => px.x < 7 * 16)!;
    expect(far.alpha).toBeLessThan(near.alpha);
  });
});
