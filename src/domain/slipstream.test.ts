import { describe, expect, it } from "vitest";
import { MAZE_COLS, MAZE_ROWS, TILE_SIZE, cellCenterX, cellCenterY, type SolidGrid } from "./maze";
import {
  applySlipstreams,
  atJunction,
  slipstreamGhostSpeedMul,
  slipstreamEcho,
  slipstreamPlayerSpeedMul,
  slipstreamRemainingMs,
  slipstreamTargets,
  tickSlipstreams,
} from "./slipstream";
import {
  SLIPSTREAM_GHOST_SPEED_MUL,
  SLIPSTREAM_MS,
  SLIPSTREAM_PLAYER_SPEED_MUL,
  clearUpgradeTimers,
  createRunUpgrades,
} from "./upgrades";

function gridWithOpen(cells: readonly (readonly [number, number])[]): SolidGrid {
  const open = new Set(cells.map(([c, r]) => `${c},${r}`));
  return Array.from({ length: MAZE_ROWS }, (_, r) =>
    Array.from({ length: MAZE_COLS }, (_, c) => !open.has(`${c},${r}`)),
  );
}

const C = 10;
const R = 10;
const T_JUNCTION = gridWithOpen([
  ...Array.from({ length: 11 }, (_, i) => [C - 5 + i, R] as const),
  ...Array.from({ length: 6 }, (_, i) => [C, R + i] as const),
]);
const at = (col: number, row: number) => ({ x: cellCenterX(col), y: cellCenterY(row) });
const BASE = ["passiveSlipstream"] as const;
const PLUS = ["passiveSlipstreamPlus"] as const;

describe("slipstream targets", () => {
  it("detects a junction but not a corridor", () => {
    expect(atJunction(at(C, R), T_JUNCTION)).toBe(true);
    expect(atJunction(at(C - 2, R), T_JUNCTION)).toBe(false);
  });

  it("base reaches a ghost within 1.5 tiles at a junction", () => {
    const near = { eid: 1, x: at(C, R).x + TILE_SIZE * 1.4, y: at(C, R).y };
    const far = { eid: 2, x: at(C, R).x + TILE_SIZE * 1.6, y: at(C, R).y };
    expect(slipstreamTargets(createRunUpgrades(), BASE, at(C, R), [near, far], T_JUNCTION)).toEqual(
      [1],
    );
  });

  it("Plus reaches 2 tiles", () => {
    const far = { eid: 2, x: at(C, R).x + TILE_SIZE * 1.9, y: at(C, R).y };
    expect(slipstreamTargets(createRunUpgrades(), PLUS, at(C, R), [far], T_JUNCTION)).toEqual([2]);
  });

  it("skips ghosts already slipstreamed", () => {
    const ghost = { eid: 1, x: at(C, R).x + 4, y: at(C, R).y };
    const state = applySlipstreams(createRunUpgrades(), [1]);
    expect(slipstreamTargets(state, BASE, at(C, R), [ghost], T_JUNCTION)).toEqual([]);
    expect(slipstreamTargets(createRunUpgrades(), BASE, at(C, R), [ghost], T_JUNCTION)).toEqual([
      1,
    ]);
  });

  it("does nothing off a junction or without the upgrade", () => {
    const ghost = { eid: 1, x: at(C - 2, R).x + 4, y: at(C - 2, R).y };
    expect(slipstreamTargets(createRunUpgrades(), BASE, at(C - 2, R), [ghost], T_JUNCTION)).toEqual(
      [],
    );
    const beside = { eid: 1, x: at(C, R).x + 4, y: at(C, R).y };
    expect(slipstreamTargets(createRunUpgrades(), [], at(C, R), [beside], T_JUNCTION)).toEqual([]);
  });
});

describe("slipstream echo", () => {
  const p = at(C, R);

  it("points down the dominant axis for the ghost's tile distance", () => {
    expect(slipstreamEcho(p, { x: p.x + TILE_SIZE * 1.4, y: p.y + 3 })).toEqual({
      ...p,
      dx: 1,
      dy: 0,
      tiles: 1,
    });
    expect(slipstreamEcho(p, { x: p.x - 2, y: p.y - TILE_SIZE * 2 })).toEqual({
      ...p,
      dx: 0,
      dy: -1,
      tiles: 2,
    });
  });

  it("has no direction for a ghost on the same spot", () => {
    expect(slipstreamEcho(p, p)).toBeNull();
  });
});

describe("slipstream timers and multipliers", () => {
  it("refreshes instead of stacking and expires", () => {
    let state = applySlipstreams(createRunUpgrades(), [1]);
    state = tickSlipstreams(state, 1000);
    state = applySlipstreams(state, [1, 2]);
    expect(state.slipstreams).toHaveLength(2);
    expect(slipstreamRemainingMs(state)).toBe(SLIPSTREAM_MS);
    expect(tickSlipstreams(state, SLIPSTREAM_MS).slipstreams).toEqual([]);
  });

  it("slows a hit ghost 30% in base and holds it in Plus, and boosts the player", () => {
    const state = applySlipstreams(createRunUpgrades(), [1]);
    expect(slipstreamGhostSpeedMul(state, BASE, 1)).toBe(SLIPSTREAM_GHOST_SPEED_MUL);
    expect(slipstreamGhostSpeedMul(state, PLUS, 1)).toBe(0);
    expect(slipstreamGhostSpeedMul(state, BASE, 2)).toBe(1);
    expect(slipstreamPlayerSpeedMul(state)).toBe(SLIPSTREAM_PLAYER_SPEED_MUL);
    expect(slipstreamPlayerSpeedMul(createRunUpgrades())).toBe(1);
  });

  it("clears with the other timers", () => {
    const state = applySlipstreams(createRunUpgrades(), [1]);
    expect(clearUpgradeTimers(state).slipstreams).toEqual([]);
  });
});
