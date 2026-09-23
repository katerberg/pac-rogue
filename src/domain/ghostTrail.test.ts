import { describe, expect, it } from "vitest";
import { pushTrailTile } from "./ghostTrail";

describe("pushTrailTile", () => {
  it("appends a new tile", () => {
    const result = pushTrailTile([], { col: 1, row: 1 }, 4);
    expect(result).toEqual({
      trail: [{ col: 1, row: 1 }],
      added: { col: 1, row: 1 },
      removed: null,
    });
  });

  it("no-ops when the tile matches the last entry", () => {
    const trail = [{ col: 1, row: 1 }];
    const result = pushTrailTile(trail, { col: 1, row: 1 }, 4);
    expect(result).toEqual({ trail: [{ col: 1, row: 1 }], added: null, removed: null });
  });

  it("trims the oldest entry once maxLen is exceeded", () => {
    const trail = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
    ];
    const result = pushTrailTile(trail, { col: 4, row: 0 }, 4);
    expect(result.trail).toEqual([
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 4, row: 0 },
    ]);
    expect(result.added).toEqual({ col: 4, row: 0 });
    expect(result.removed).toEqual({ col: 0, row: 0 });
  });

  it("supports a shorter maxLen for the pellet dropper trail", () => {
    const trail = [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
    ];
    const result = pushTrailTile(trail, { col: 3, row: 0 }, 3);
    expect(result.trail).toEqual([
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
    ]);
    expect(result.removed).toEqual({ col: 0, row: 0 });
  });
});
