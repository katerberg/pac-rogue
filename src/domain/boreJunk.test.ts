import { describe, expect, it } from "vitest";
import { ageBoreJunk, BORE_JUNK_SETTLE_MS, boreJunk } from "./boreJunk";
import { rubbleMotePosition } from "./collapseRubble";
import { WALL_ART_PX } from "./pixelWall";

const TILE = 16;
const ART = TILE / WALL_ART_PX;

describe("boreJunk", () => {
  it("is the same pile for the same tile, and chips fly off the drilled face", () => {
    const pile = boreJunk({ col: 4, row: 2 }, 1, 0, TILE, false);
    expect(boreJunk({ col: 4, row: 2 }, 1, 0, TILE, false)).toEqual(pile);
    expect(pile.chips.every((chip) => chip.fromX === 5 * ART)).toBe(true);
  });

  it("settles every chip on the bored tile's floor", () => {
    const pile = boreJunk({ col: 4, row: 2 }, 0, -1, TILE, false);
    for (const chip of pile.chips) {
      const at = rubbleMotePosition(chip, BORE_JUNK_SETTLE_MS);
      expect(at.landed).toBe(true);
      expect(Math.floor(at.x / ART)).toBe(4);
      expect(Math.floor(at.y / ART)).toBe(2);
    }
  });

  it("leaves a bigger pile where it bores through rubble", () => {
    const wall = boreJunk({ col: 4, row: 2 }, 1, 0, TILE, false);
    const rubble = boreJunk({ col: 4, row: 2 }, 1, 0, TILE, true);
    expect(rubble.chips.length).toBeGreaterThan(wall.chips.length);
  });

  it("ages up to settled and then stops changing", () => {
    const piles = [boreJunk({ col: 1, row: 1 }, 1, 0, TILE, false)];
    const settled = ageBoreJunk(piles, BORE_JUNK_SETTLE_MS * 2);
    expect(settled[0]!.ageMs).toBe(BORE_JUNK_SETTLE_MS);
    expect(ageBoreJunk(settled, 16)).toBe(settled);
  });
});
