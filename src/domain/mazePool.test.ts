import { describe, expect, it } from "vitest";
import { layoutFromAscii } from "./maze";
import { MAZE_POOL, mazePoolMap, mazePoolSize, pickPoolIndex } from "./mazePool";

describe("mazePool", () => {
  it("loads a non-empty dense pool", () => {
    expect(mazePoolSize()).toBe(MAZE_POOL.length);
    expect(mazePoolSize()).toBeGreaterThan(50);
    expect(MAZE_POOL[0]?.id).toBe(0);
    expect(MAZE_POOL[MAZE_POOL.length - 1]?.id).toBe(MAZE_POOL.length - 1);
  });

  it("returns null for out-of-range pool ids", () => {
    expect(mazePoolMap(-1)).toBeNull();
    expect(mazePoolMap(mazePoolSize())).toBeNull();
    expect(mazePoolMap(0)?.ascii.length).toBeGreaterThan(0);
  });

  it("picks a stable pool index from the run seed", () => {
    expect(pickPoolIndex("seed-a")).toBe(pickPoolIndex("seed-a"));
    expect(pickPoolIndex("seed-a")).not.toBe(pickPoolIndex("seed-b"));
    expect(pickPoolIndex("seed-a")).toBeGreaterThanOrEqual(0);
    expect(pickPoolIndex("seed-a")).toBeLessThan(mazePoolSize());
  });

  it("every pool map parses as a valid layout", () => {
    for (const map of MAZE_POOL) {
      const layout = layoutFromAscii(map.ascii);
      expect(layout.pelletCount).toBe(map.pelletCount);
      expect(layout.cols).toBe(28);
      expect(layout.rows).toBe(34);
    }
  });
});
