import { describe, expect, it } from "vitest";
import { MAZE_COLS, MAZE_ROWS, TILE_SIZE, cellCenterX, cellCenterY, type SolidGrid } from "./maze";
import {
  applySonicHits,
  atTopSpeed,
  sonicBoomBranches,
  sonicBoomHitMs,
  sonicBoomStuns,
  sonicBoomTargets,
  sonicHitRemainingMs,
  sonicStunShakePx,
  sonicStunnedEids,
  sonicStunSpriteOffsets,
  tickSonicHits,
} from "./sonicBoom";
import { SONIC_BOOM_STUN_MS, SONIC_BOOM_TURN_COOLDOWN_MS, createRunUpgrades } from "./upgrades";

function gridWithOpen(cells: readonly (readonly [number, number])[]): SolidGrid {
  const open = new Set(cells.map(([c, r]) => `${c},${r}`));
  return Array.from({ length: MAZE_ROWS }, (_, r) =>
    Array.from({ length: MAZE_COLS }, (_, c) => !open.has(`${c},${r}`)),
  );
}

const C = 10;
const R = 10;
const CROSS = gridWithOpen([
  ...Array.from({ length: 11 }, (_, i) => [C - 5 + i, R] as const),
  ...Array.from({ length: 11 }, (_, i) => [C, R - 5 + i] as const),
]);
const T_JUNCTION = gridWithOpen([
  ...Array.from({ length: 11 }, (_, i) => [C - 5 + i, R] as const),
  ...Array.from({ length: 6 }, (_, i) => [C, R + i] as const),
]);

const at = (col: number, row: number) => ({ x: cellCenterX(col), y: cellCenterY(row) });
const player = (col: number, row: number, dc: number, dr: number) => ({
  ...at(col, row),
  heading: { dc, dr },
});
const ghost = (eid: number, col: number, row: number) => ({ eid, ...at(col, row) });

describe("Sonic Boom", () => {
  const BASE = ["passiveSonicBoom"] as const;
  const PLUS = ["passiveSonicBoomPlus"] as const;

  it("hits a ghost within 2 tiles and not beyond it", () => {
    const near = { eid: 1, x: at(C, R).x + TILE_SIZE * 2, y: at(C, R).y };
    const far = { eid: 2, x: at(C, R).x + TILE_SIZE * 2.5, y: at(C, R).y };
    expect(sonicBoomTargets(BASE, player(C, R, 1, 0), [near, far], CROSS)).toEqual([1]);
  });

  it("does nothing when not owned", () => {
    expect(sonicBoomTargets([], player(C, R, 1, 0), [ghost(1, C, R)], CROSS)).toEqual([]);
  });

  it.each(["passiveSonicBoom", "passiveSonicBoomPlus"] as const)(
    "%s reaches 4 tiles down both side hallways of an X",
    (id) => {
      const hits = sonicBoomTargets(
        [id],
        player(C, R, 1, 0),
        [ghost(1, C, R - 4), ghost(2, C, R + 4), ghost(3, C, R - 5)],
        CROSS,
      );
      expect(hits.sort()).toEqual([1, 2]);
    },
  );

  it("never reaches forward or backward", () => {
    const hits = sonicBoomTargets(
      BASE,
      player(C, R, 1, 0),
      [ghost(1, C + 4, R), ghost(2, C - 4, R)],
      CROSS,
    );
    expect(hits).toEqual([]);
  });

  it("reaches the one side hallway of a T", () => {
    const hits = sonicBoomTargets(
      BASE,
      player(C, R, 1, 0),
      [ghost(1, C, R + 4), ghost(2, C, R - 4)],
      T_JUNCTION,
    );
    expect(hits).toEqual([1]);
  });

  it("ignores plain corridors", () => {
    expect(sonicBoomTargets(BASE, player(C + 2, R, 1, 0), [ghost(1, C, R + 3)], CROSS)).toEqual([]);
  });

  it("is blocked by walls in the hallway", () => {
    const walled = gridWithOpen([
      ...Array.from({ length: 11 }, (_, i) => [C - 5 + i, R] as const),
      [C, R + 1],
      [C, R - 1],
      [C, R - 3],
    ]);
    expect(sonicBoomTargets(BASE, player(C, R, 1, 0), [ghost(1, C, R - 3)], walled)).toEqual([]);
  });

  it("Plus stuns refresh instead of stacking and tick away", () => {
    const once = applySonicHits(createRunUpgrades(), [7], 2000, true);
    const again = applySonicHits(tickSonicHits(once, 400), [7], 2000, true);
    expect(again.sonicHits).toEqual([{ eid: 7, remainingMs: 2000 }]);
    expect(sonicHitRemainingMs(tickSonicHits(again, 2000))).toBe(0);
  });

  it("base turn cooldown keeps its timer when hit again", () => {
    const once = applySonicHits(createRunUpgrades(), [7], 1000, false);
    const again = applySonicHits(tickSonicHits(once, 400), [7], 1000, false);
    expect(again.sonicHits).toEqual([{ eid: 7, remainingMs: 600 }]);
  });

  it("base turns ghosts around for a 1s cooldown, Plus stuns them for 2s", () => {
    expect(sonicBoomHitMs(BASE)).toBe(SONIC_BOOM_TURN_COOLDOWN_MS);
    expect(sonicBoomHitMs(PLUS)).toBe(SONIC_BOOM_STUN_MS);
    expect(sonicBoomStuns(BASE)).toBe(false);
    expect(sonicBoomStuns(PLUS)).toBe(true);
    expect(sonicBoomHitMs([])).toBe(0);
  });

  it("counts a blur trail or Afterburner on a cleared tile as top speed", () => {
    expect(atTopSpeed([], true, false, false)).toBe(true);
    expect(atTopSpeed(["passiveAfterburner"], false, true, false)).toBe(true);
    expect(atTopSpeed(["passiveAfterburnerPlus"], false, true, false)).toBe(true);
    expect(atTopSpeed(["passiveAfterburner"], false, false, false)).toBe(false);
    expect(atTopSpeed([], false, true, false)).toBe(false);
  });

  it("counts a fast speed zone as top speed", () => {
    expect(atTopSpeed([], false, false, true)).toBe(true);
  });

  it("shakes stunned ghosts sideways only, and only when Plus stuns", () => {
    const stunned = applySonicHits(createRunUpgrades(PLUS), [7], 2000, true);
    const offsets = sonicStunSpriteOffsets(tickSonicHits(stunned, 20), PLUS, undefined)!;
    expect(offsets[7]!.x).toBeCloseTo(sonicStunShakePx(1980));
    expect(Math.abs(offsets[7]!.x)).toBeGreaterThan(0);
    expect(offsets[7]!.y).toBe(0);
    expect(sonicStunSpriteOffsets(stunned, BASE, undefined)).toBeUndefined();
    expect(sonicStunSpriteOffsets(createRunUpgrades(), PLUS, undefined)).toBeUndefined();
    expect([...sonicStunnedEids(stunned, PLUS)]).toEqual([7]);
    expect([...sonicStunnedEids(stunned, BASE)]).toEqual([]);
  });

  it("lists each side hallway of a junction up to the reach, never forward or back", () => {
    const branches = sonicBoomBranches(BASE, player(C, R, 1, 0), CROSS);
    expect(branches.map((b) => [b.dc, b.dr, b.cells.length]).sort()).toEqual([
      [0, -1, 4],
      [0, 1, 4],
    ]);
    expect(sonicBoomBranches([], player(C, R, 1, 0), CROSS)).toEqual([]);
    expect(sonicBoomBranches(BASE, player(C + 2, R, 1, 0), CROSS)).toEqual([]);
  });
});
