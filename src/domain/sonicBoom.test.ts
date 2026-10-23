import { describe, expect, it } from "vitest";
import { MAZE_COLS, MAZE_ROWS, TILE_SIZE, cellCenterX, cellCenterY, type SolidGrid } from "./maze";
import {
  applySonicStuns,
  atTopSpeed,
  sonicBoomBranches,
  sonicBoomStunMs,
  sonicBoomTargets,
  sonicStunRemainingMs,
  sonicStunShakePx,
  sonicStunSpriteOffsets,
  tickSonicStuns,
} from "./sonicBoom";
import { SONIC_BOOM_STUN_MS, createRunUpgrades } from "./upgrades";

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
  it("stuns a ghost within 2 tiles and not beyond it", () => {
    const near = { eid: 1, x: at(C, R).x + TILE_SIZE * 2, y: at(C, R).y };
    const far = { eid: 2, x: at(C, R).x + TILE_SIZE * 2.5, y: at(C, R).y };
    expect(sonicBoomTargets(["passiveSonicBoom"], player(C, R, 1, 0), [near, far], CROSS)).toEqual([
      1,
    ]);
  });

  it("does nothing when not owned", () => {
    expect(sonicBoomTargets([], player(C, R, 1, 0), [ghost(1, C, R)], CROSS)).toEqual([]);
  });

  it("base form ignores ghosts down a side hallway", () => {
    expect(
      sonicBoomTargets(["passiveSonicBoom"], player(C, R, 1, 0), [ghost(1, C, R - 3)], CROSS),
    ).toEqual([]);
  });

  it("Plus reaches 4 tiles down both side hallways of an X", () => {
    const hits = sonicBoomTargets(
      ["passiveSonicBoomPlus"],
      player(C, R, 1, 0),
      [ghost(1, C, R - 4), ghost(2, C, R + 4), ghost(3, C, R - 5)],
      CROSS,
    );
    expect(hits.sort()).toEqual([1, 2]);
  });

  it("Plus never reaches forward or backward", () => {
    const hits = sonicBoomTargets(
      ["passiveSonicBoomPlus"],
      player(C, R, 1, 0),
      [ghost(1, C + 4, R), ghost(2, C - 4, R)],
      CROSS,
    );
    expect(hits).toEqual([]);
  });

  it("Plus reaches the one side hallway of a T", () => {
    const hits = sonicBoomTargets(
      ["passiveSonicBoomPlus"],
      player(C, R, 1, 0),
      [ghost(1, C, R + 4), ghost(2, C, R - 4)],
      T_JUNCTION,
    );
    expect(hits).toEqual([1]);
  });

  it("Plus ignores plain corridors", () => {
    const hits = sonicBoomTargets(
      ["passiveSonicBoomPlus"],
      player(C + 2, R, 1, 0),
      [ghost(1, C, R + 3)],
      CROSS,
    );
    expect(hits).toEqual([]);
  });

  it("is blocked by walls in the hallway", () => {
    const walled = gridWithOpen([
      ...Array.from({ length: 11 }, (_, i) => [C - 5 + i, R] as const),
      [C, R + 1],
      [C, R - 1],
      [C, R - 3],
    ]);
    expect(
      sonicBoomTargets(["passiveSonicBoomPlus"], player(C, R, 1, 0), [ghost(1, C, R - 3)], walled),
    ).toEqual([]);
  });

  it("stuns refresh instead of stacking and tick away", () => {
    const base = createRunUpgrades(["passiveSonicBoom"]);
    const once = applySonicStuns(base, [7], 1000);
    const again = applySonicStuns(tickSonicStuns(once, 400), [7], 1000);
    expect(again.sonicStuns).toEqual([{ eid: 7, remainingMs: 1000 }]);
    expect(sonicStunRemainingMs(tickSonicStuns(again, 1000))).toBe(0);
  });

  it("uses the same stun length in both forms", () => {
    expect(sonicBoomStunMs(["passiveSonicBoom"])).toBe(SONIC_BOOM_STUN_MS);
    expect(sonicBoomStunMs(["passiveSonicBoomPlus"])).toBe(SONIC_BOOM_STUN_MS);
    expect(sonicBoomStunMs([])).toBe(0);
  });

  it("counts a blur trail or Afterburner on a cleared tile as top speed", () => {
    expect(atTopSpeed([], true, false, false)).toBe(true);
    expect(atTopSpeed(["passiveAfterburner"], false, true, false)).toBe(true);
    expect(atTopSpeed(["passiveAfterburnerPlus"], false, true, false)).toBe(true);
    expect(atTopSpeed(["passiveAfterburner"], false, false, false)).toBe(false);
    expect(atTopSpeed([], false, true, false)).toBe(false);
  });

  it("shakes stunned ghosts sideways only", () => {
    const stunned = applySonicStuns(createRunUpgrades(["passiveSonicBoom"]), [7], 1000);
    const offsets = sonicStunSpriteOffsets(tickSonicStuns(stunned, 20), undefined)!;
    expect(offsets[7]!.x).toBeCloseTo(sonicStunShakePx(980));
    expect(Math.abs(offsets[7]!.x)).toBeGreaterThan(0);
    expect(offsets[7]!.y).toBe(0);
    expect(sonicStunSpriteOffsets(createRunUpgrades(), undefined)).toBeUndefined();
  });

  it("counts a fast speed zone as top speed", () => {
    expect(atTopSpeed([], false, false, true)).toBe(true);
  });

  it("lists each side hallway of a junction up to the reach, never forward or back", () => {
    const branches = sonicBoomBranches(["passiveSonicBoomPlus"], player(C, R, 1, 0), CROSS);
    expect(branches.map((b) => [b.dc, b.dr, b.cells.length]).sort()).toEqual([
      [0, -1, 4],
      [0, 1, 4],
    ]);
    expect(sonicBoomBranches(["passiveSonicBoom"], player(C, R, 1, 0), CROSS)).toEqual([]);
    expect(sonicBoomBranches(["passiveSonicBoomPlus"], player(C + 2, R, 1, 0), CROSS)).toEqual([]);
  });
});
