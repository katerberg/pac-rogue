import { describe, expect, it } from "vitest";
import {
  SCARECROW_LINGER_BLINK_MS,
  SCARECROW_RADIUS_TILES,
  SCARECROW_BASE_ALPHA,
  SCARECROW_PIXEL_PX,
  addScentLingers,
  scentBlocksStep,
  scentLingerAlphaMul,
  inScentZone,
  scentCells,
  scentRouteStep,
  scentPixels,
  scentLineWidth,
  scentCenterPixels,
  SCARECROW_CENTER_ALPHA,
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

describe("scent core", () => {
  it("tapers the line from 5 wide at the source to 1 wide two tiles out", () => {
    expect(scentLineWidth(0, 16)).toBe(5);
    expect(scentLineWidth(16, 16)).toBe(3);
    expect(scentLineWidth(32, 16)).toBe(1);
    expect(scentLineWidth(60, 16)).toBe(1);
  });

  it("tapers by distance from the origin, not from crossing corridors", () => {
    const cross = (col: number, row: number) => (row === 10 && col >= 6 && col <= 14) || col === 12;
    const cells = scentCells(zone, R, (col, row) => cross(col, row) && row >= 6 && row <= 14);
    const px = scentPixels(zone, cells, R, 16, 0, 0, 0, cross);
    const side = px.filter(
      (p) => p.x >= 12 * 16 && p.x < 13 * 16 && p.y >= 9 * 16 && p.y < 10 * 16,
    );
    const rows = new Set(side.map((p) => p.y));
    expect(rows.size).toBeGreaterThan(0);
    const column = side.filter((p) => p.y === side[0]!.y);
    expect(column.length).toBeLessThanOrEqual(1);
  });

  it("marks the center point brighter than the surrounding scent", () => {
    const marker = scentCenterPixels(zone, 16, 0, 0);
    expect(marker).toHaveLength(9);
    expect(marker.every((px) => px.alpha === SCARECROW_CENTER_ALPHA)).toBe(true);
    const xs = marker.map((px) => px.x);
    expect((Math.min(...xs) + Math.max(...xs) + SCARECROW_PIXEL_PX) / 2).toBe(zone.col * 16 + 8);
  });
});

describe("scentRouteStep", () => {
  const open = () => true;
  const route = (target: { col: number; row: number }, wall: (c: number, r: number) => boolean) =>
    scentRouteStep({
      from: { col: 2, row: 2 },
      target,
      cols: 20,
      rows: 8,
      passable: open,
      blocked: wall,
    });

  it("steps straight toward the target when nothing blocks", () => {
    expect(route({ col: 6, row: 2 }, () => false)).toEqual({ dx: 1, dy: 0 });
  });

  it("detours around blocked cells instead of pushing into them", () => {
    const wall = (c: number, r: number) => c === 4 && r <= 3;
    expect(route({ col: 6, row: 2 }, wall)).toEqual({ dx: 0, dy: 1 });
  });

  it("heads for the reachable cell nearest an unreachable target", () => {
    const wall = (c: number) => c >= 4;
    expect(route({ col: 6, row: 2 }, wall)).toEqual({ dx: 1, dy: 0 });
  });

  it("stays put when it is already the nearest reachable cell", () => {
    const wall = (c: number, r: number) => (c === 3 && r === 2) || (c === 2 && r !== 2) || c < 2;
    expect(route({ col: 6, row: 2 }, wall)).toBeNull();
  });

  it("routes through a wrapped tunnel edge", () => {
    expect(
      scentRouteStep({
        from: { col: 0, row: 2 },
        target: { col: 7, row: 2 },
        cols: 8,
        rows: 8,
        passable: () => true,
        blocked: (c) => c >= 2 && c <= 5,
      }),
    ).toEqual({ dx: -1, dy: 0 });
  });

  it("flags cells inside a zone", () => {
    expect(inScentZone([{ col: 5, row: 5 }], 5, 8, 4)).toBe(true);
    expect(inScentZone([{ col: 5, row: 5 }], 5, 10, 4)).toBe(false);
  });
});
