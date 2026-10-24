import { beforeEach, describe, expect, it } from "vitest";
import {
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  worldToCol,
  worldToRow,
} from "./maze";
import { SLIME_ART, slimePixels, type SlimeTrailView } from "./slimeArt";

const row = 1;
const corridor = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ col: from + i, row }));

function trail(tiles = corridor(1, 6), head = true): SlimeTrailView {
  const newest = tiles[tiles.length - 1]!;
  return {
    head: head ? { x: cellCenterX(newest.col) + 4, y: cellCenterY(newest.row) } : null,
    tiles,
    maxTiles: tiles.length,
  };
}

const PALETTE: number[] = [
  SLIME_ART.rim,
  SLIME_ART.body,
  SLIME_ART.light,
  SLIME_ART.shine,
  SLIME_ART.glint,
];

describe("slime art", () => {
  beforeEach(() => activateLayout("maze1"));

  it("draws nothing without trails", () => {
    expect(slimePixels([], 0)).toEqual([]);
  });

  it("draws opaque palette pixels only on corridor floor", () => {
    const { walls } = getActiveLayout();
    const pixels = slimePixels([trail()], 1234);
    expect(pixels.length).toBeGreaterThan(0);
    for (const pixel of pixels) {
      expect(PALETTE).toContain(pixel.color);
      const col = worldToCol(pixel.x + pixel.size / 2);
      const r = worldToRow(pixel.y + pixel.size / 2);
      expect(walls[r]![col]).toBe(false);
    }
  });

  it("is thicker at the head than the tail", () => {
    const pixels = slimePixels([trail()], 0);
    const inCol = (col: number) =>
      pixels.filter((pixel) => worldToCol(pixel.x + pixel.size / 2) === col).length;
    expect(inCol(6)).toBeGreaterThan(inCol(1));
  });

  it("is the same picture for the same time", () => {
    expect(slimePixels([trail()], 777)).toEqual(slimePixels([trail()], 777));
  });

  it("twinkles white glints on the slime over time", () => {
    let glints = 0;
    for (let ms = 0; ms < 6000; ms += 50) {
      for (const pixel of slimePixels([trail()], ms)) {
        if (pixel.color === SLIME_ART.glint) {
          glints += 1;
          expect(worldToRow(pixel.y + pixel.size / 2)).toBe(row);
        }
      }
    }
    expect(glints).toBeGreaterThan(0);
  });

  it("never bridges tiles that aren't neighbours", () => {
    const pixels = slimePixels([trail([...corridor(1, 2), ...corridor(10, 11)], false)], 0);
    const cols = new Set(pixels.map((pixel) => worldToCol(pixel.x + pixel.size / 2)));
    for (const col of [4, 5, 6, 7]) {
      expect(cols.has(col)).toBe(false);
    }
  });
});
