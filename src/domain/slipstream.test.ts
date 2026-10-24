import { describe, expect, it } from "vitest";
import { MAZE_COLS, MAZE_ROWS, cellCenterX, cellCenterY, type SolidGrid } from "./maze";
import {
  applySlipstream,
  atJunction,
  slipstreamGhostMul,
  slipstreamHeldEids,
  slipstreamPlayerMul,
  slipstreamRemainingMs,
  slipstreamTargets,
  tickSlipstream,
} from "./slipstream";
import {
  SLIPSTREAM_GHOST_SPEED_MUL,
  SLIPSTREAM_MS,
  SLIPSTREAM_PLAYER_SPEED_MUL,
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
const CROSS = gridWithOpen([
  ...Array.from({ length: 11 }, (_, i) => [C - 5 + i, R] as const),
  ...Array.from({ length: 11 }, (_, i) => [C, R - 5 + i] as const),
]);
const CORRIDOR = gridWithOpen(Array.from({ length: 11 }, (_, i) => [C - 5 + i, R] as const));

const at = (col: number, row: number) => ({ x: cellCenterX(col), y: cellCenterY(row) });
const ghost = (eid: number, col: number, row: number) => ({ eid, ...at(col, row) });

const BASE = ["passiveSlipstream"] as const;
const PLUS = ["passiveSlipstreamPlus"] as const;

describe("slipstream", () => {
  it("only counts a tile with three or more open sides as a junction", () => {
    expect(atJunction(at(C, R), CROSS)).toBe(true);
    expect(atJunction(at(C - 1, R), CROSS)).toBe(false);
    expect(atJunction(at(C, R), CORRIDOR)).toBe(false);
  });

  it("base hits a ghost one tile away at a junction, not two", () => {
    expect(slipstreamTargets(BASE, at(C, R), [ghost(1, C + 1, R)], CROSS)).toEqual([1]);
    expect(slipstreamTargets(BASE, at(C, R), [ghost(1, C + 2, R)], CROSS)).toEqual([]);
  });

  it("Plus reaches two tiles", () => {
    expect(slipstreamTargets(PLUS, at(C, R), [ghost(1, C + 2, R)], CROSS)).toEqual([1]);
    expect(slipstreamTargets(PLUS, at(C, R), [ghost(1, C + 3, R)], CROSS)).toEqual([]);
  });

  it("does nothing in a corridor or without the upgrade", () => {
    expect(slipstreamTargets(BASE, at(C, R), [ghost(1, C + 1, R)], CORRIDOR)).toEqual([]);
    expect(slipstreamTargets([], at(C, R), [ghost(1, C + 1, R)], CROSS)).toEqual([]);
  });

  it("slows the ghost and speeds up the player, then expires", () => {
    let state = applySlipstream(createRunUpgrades(), BASE, [1]);
    expect(slipstreamRemainingMs(state)).toBe(SLIPSTREAM_MS);
    expect(slipstreamGhostMul(state, BASE, 1)).toBe(SLIPSTREAM_GHOST_SPEED_MUL);
    expect(slipstreamGhostMul(state, BASE, 2)).toBe(1);
    expect(slipstreamPlayerMul(state, BASE)).toBe(SLIPSTREAM_PLAYER_SPEED_MUL);
    expect(slipstreamHeldEids(state, BASE).size).toBe(0);
    state = tickSlipstream(state, SLIPSTREAM_MS);
    expect(state.slipstreamHits).toEqual([]);
    expect(slipstreamPlayerMul(state, BASE)).toBe(1);
  });

  it("Plus holds the ghost still and a re-hit refreshes instead of stacking", () => {
    let state = applySlipstream(createRunUpgrades(), PLUS, [1]);
    expect(slipstreamGhostMul(state, PLUS, 1)).toBe(0);
    expect([...slipstreamHeldEids(state, PLUS)]).toEqual([1]);
    state = tickSlipstream(state, 1000);
    state = applySlipstream(state, PLUS, [1]);
    expect(state.slipstreamHits).toEqual([{ eid: 1, remainingMs: SLIPSTREAM_MS }]);
    expect(slipstreamPlayerMul(state, PLUS)).toBe(SLIPSTREAM_PLAYER_SPEED_MUL);
  });
});
