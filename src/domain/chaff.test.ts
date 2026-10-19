import { describe, expect, it } from "vitest";
import {
  CHAFF_ALPHA,
  CHAFF_BODY_TINT,
  CHAFF_ENHANCED_MS,
  CHAFF_MS,
  CHAFF_VISOR_TINT,
  chaffSpawnTiles,
  decoyTile,
  nearestDecoy,
  startChaff,
  tickChaff,
} from "./chaff";
import { getActiveLayout, isWalkable } from "./maze";

describe("chaff", () => {
  it("uses frightened-blue body tint, a lighter visor tint, and full opacity", () => {
    expect(CHAFF_BODY_TINT).toBe(0x001eff);
    expect(CHAFF_VISOR_TINT).toBe(0x6678ff);
    expect(CHAFF_ALPHA).toBe(1);
  });

  it("spawns one walkable decoy near the center, or four near the corners", () => {
    const layout = getActiveLayout();
    const center = chaffSpawnTiles(false);
    expect(center).toHaveLength(1);
    expect(Math.abs(center[0]!.col - layout.cols / 2)).toBeLessThan(layout.cols / 4);
    const corners = chaffSpawnTiles(true);
    expect(corners).toHaveLength(4);
    expect(new Set(corners.map((t) => `${t.col},${t.row}`)).size).toBe(4);
    for (const tile of [...center, ...corners]) {
      expect(isWalkable(tile.col, tile.row, layout.playerSolids)).toBe(true);
    }
  });

  it("random-walks onto walkable tiles", () => {
    const layout = getActiveLayout();
    let state = startChaff(CHAFF_MS, false);
    const spawn = decoyTile(state.decoys[0]!);
    expect(state.remainingMs).toBe(CHAFF_MS);
    for (let i = 0; i < 100; i += 1) {
      const tick = tickChaff(state, 16, () => 0.37, []);
      state = tick.state!;
      for (const decoy of state.decoys) {
        const tile = decoyTile(decoy);
        expect(isWalkable(tile.col, tile.row, layout.playerSolids)).toBe(true);
      }
    }
    expect(decoyTile(state.decoys[0]!)).not.toEqual(spawn);
  });

  it("bursts every decoy when time runs out", () => {
    const state = startChaff(CHAFF_ENHANCED_MS, true);
    const tick = tickChaff(state, CHAFF_ENHANCED_MS, () => 0, []);
    expect(tick.state).toBeNull();
    expect(tick.burst).toHaveLength(4);
  });

  it("removes only a touched decoy and ends once none are left", () => {
    const state = startChaff(CHAFF_ENHANCED_MS, true);
    const first = decoyTile(state.decoys[0]!);
    const one = tickChaff(state, 0, () => 0, [first]);
    expect(one.burst).toEqual([first]);
    expect(one.state?.decoys).toHaveLength(3);
    const all = tickChaff(state, 0, () => 0, state.decoys.map(decoyTile));
    expect(all.state).toBeNull();
    expect(all.burst).toHaveLength(4);
  });

  it("picks the nearest decoy", () => {
    const state = startChaff(CHAFF_ENHANCED_MS, true);
    const tile = decoyTile(state.decoys[3]!);
    expect(nearestDecoy(state.decoys, tile.col, tile.row)).toBe(state.decoys[3]);
    expect(nearestDecoy([], 0, 0)).toBeNull();
  });
});
