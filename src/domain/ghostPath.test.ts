import { describe, expect, it } from "vitest";
import {
  GHOST_DIR,
  isPerpendicularLCorner,
  lCornerTurnDir,
  openGhostDirsAt,
  pickGhostDirection,
  reverseGhostDir,
} from "./ghostPath";
import { getActiveLayout, canGhostEnterDirection, cellCenterX, cellCenterY } from "./maze";
import { blinkyScatterTarget, GHOST_PHASE } from "./ghostTarget";

const L_SAMPLES = [
  { col: 26, row: 1, intoWall: GHOST_DIR.right, turn: GHOST_DIR.down },
  { col: 15, row: 1, intoWall: GHOST_DIR.left, turn: GHOST_DIR.down },
  { col: 1, row: 1, intoWall: GHOST_DIR.left, turn: GHOST_DIR.down },
  { col: 15, row: 8, intoWall: GHOST_DIR.up, turn: GHOST_DIR.right },
  { col: 18, row: 8, intoWall: GHOST_DIR.right, turn: GHOST_DIR.up },
] as const;

describe("ghostPath", () => {
  const ghostSolids = getActiveLayout().ghostSolids;

  it("prefers the neighbor closer to the target", () => {
    const x = cellCenterX(6);
    const y = cellCenterY(5);
    const dir = pickGhostDirection({
      x,
      y,
      facing: GHOST_DIR.left,
      targetCol: 6,
      targetRow: 1,
      solids: ghostSolids,
    });
    expect(dir).toBe(GHOST_DIR.up);
  });

  it("breaks equal distance ties with up > left > down > right", () => {
    const x = cellCenterX(1);
    const y = cellCenterY(5);
    const dir = pickGhostDirection({
      x,
      y,
      facing: GHOST_DIR.none,
      targetCol: 1,
      targetRow: 5,
      solids: ghostSolids,
    });
    expect(dir).toBe(GHOST_DIR.up);
  });

  it("does not reverse when another candidate exists", () => {
    const x = cellCenterX(6);
    const y = cellCenterY(5);
    const dir = pickGhostDirection({
      x,
      y,
      facing: GHOST_DIR.right,
      targetCol: 1,
      targetRow: 5,
      solids: ghostSolids,
    });
    expect(dir).not.toBe(GHOST_DIR.left);
  });

  it("identifies perpendicular L corners vs corridors", () => {
    const ne = openGhostDirsAt(cellCenterX(26), cellCenterY(1), ghostSolids);
    expect(isPerpendicularLCorner(ne)).toBe(true);
    expect(lCornerTurnDir(ne, GHOST_DIR.right)).toBe(GHOST_DIR.down);

    const corridor = openGhostDirsAt(cellCenterX(20), cellCenterY(1), ghostSolids);
    expect(corridor).toEqual([GHOST_DIR.left, GHOST_DIR.right]);
    expect(isPerpendicularLCorner(corridor)).toBe(false);
  });

  it("never reverses at common L corners for any scatter/chase target", () => {
    const targets = [
      blinkyScatterTarget(),
      { col: 1, row: 1 },
      { col: 26, row: 1 },
      { col: 6, row: 23 },
      { col: 13, row: 14 },
    ];
    for (const sample of L_SAMPLES) {
      const opens = openGhostDirsAt(cellCenterX(sample.col), cellCenterY(sample.row), ghostSolids);
      expect(isPerpendicularLCorner(opens)).toBe(true);
      for (const target of targets) {
        const dir = pickGhostDirection({
          x: cellCenterX(sample.col),
          y: cellCenterY(sample.row),
          facing: sample.intoWall,
          targetCol: target.col,
          targetRow: target.row,
          solids: ghostSolids,
        });
        expect(dir).toBe(sample.turn);
        expect(dir).not.toBe(reverseGhostDir(sample.intoWall));
      }
    }
  });

  it("turns down at Blinky NE tip when facing into the wall", () => {
    const dir = pickGhostDirection({
      x: cellCenterX(26),
      y: cellCenterY(1),
      facing: GHOST_DIR.right,
      targetCol: blinkyScatterTarget().col,
      targetRow: blinkyScatterTarget().row,
      solids: ghostSolids,
    });
    expect(dir).toBe(GHOST_DIR.down);
  });

  it("turns down at row-1 west tip when facing into the wall", () => {
    const dir = pickGhostDirection({
      x: cellCenterX(15),
      y: cellCenterY(1),
      facing: GHOST_DIR.left,
      targetCol: blinkyScatterTarget().col,
      targetRow: blinkyScatterTarget().row,
      solids: ghostSolids,
    });
    expect(dir).toBe(GHOST_DIR.down);
  });

  it("patrols NE scatter without oscillating on row 1 when facing is preserved", () => {
    let col = 21;
    let row = 1;
    let facing: (typeof GHOST_DIR)[keyof typeof GHOST_DIR] = GHOST_DIR.right;
    let downFrom26 = 0;
    let visits26 = 0;
    let row1OnlyStreak = 0;
    let maxRow1Streak = 0;

    for (let i = 0; i < 60; i += 1) {
      const next = pickGhostDirection({
        x: cellCenterX(col),
        y: cellCenterY(row),
        facing,
        targetCol: blinkyScatterTarget().col,
        targetRow: blinkyScatterTarget().row,
        solids: ghostSolids,
      });
      if (col === 26 && row === 1) {
        visits26 += 1;
        if (next === GHOST_DIR.down) {
          downFrom26 += 1;
        }
      }
      if (row === 1) {
        row1OnlyStreak += 1;
        maxRow1Streak = Math.max(maxRow1Streak, row1OnlyStreak);
      } else {
        row1OnlyStreak = 0;
      }
      if (next === GHOST_DIR.up) row -= 1;
      else if (next === GHOST_DIR.down) row += 1;
      else if (next === GHOST_DIR.left) col -= 1;
      else if (next === GHOST_DIR.right) col += 1;
      else break;
      facing = next;
    }

    expect(visits26).toBeGreaterThan(0);
    expect(downFrom26).toBe(visits26);
    expect(maxRow1Streak).toBeLessThan(20);
  });

  it("never chooses down onto the house door from the exit tile", () => {
    const dir = pickGhostDirection({
      x: cellCenterX(13),
      y: cellCenterY(11),
      facing: GHOST_DIR.none,
      targetCol: 13,
      targetRow: 14,
      solids: ghostSolids,
      canEnter: (x, y, dx, dy) => canGhostEnterDirection(x, y, dx, dy, GHOST_PHASE.active),
    });
    expect(dir).not.toBe(GHOST_DIR.down);
  });
});
