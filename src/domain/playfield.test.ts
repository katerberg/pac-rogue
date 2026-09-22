import { afterEach, describe, expect, it } from "vitest";
import { activateLayout, CLASSIC_TILE_SIZE, TILE_SIZE } from "./maze";
import { speedTileScale } from "./playfield";

describe("speedTileScale", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("is 1 at the classic reference tile size", () => {
    activateLayout("maze1");
    expect(TILE_SIZE).toBe(CLASSIC_TILE_SIZE);
    expect(speedTileScale()).toBeCloseTo(1);
  });

  it("scales up for mazeSmall's larger tiles, keeping tiles-per-second constant", () => {
    activateLayout("mazeSmall");
    expect(TILE_SIZE).toBeGreaterThan(CLASSIC_TILE_SIZE);
    expect(speedTileScale()).toBeCloseTo(TILE_SIZE / CLASSIC_TILE_SIZE);
    expect(speedTileScale()).toBeGreaterThan(1);
  });
});
