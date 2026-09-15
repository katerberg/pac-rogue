import { describe, expect, it } from "vitest";
import { GHOST_DIR, pickGhostDirection } from "./ghostPath";
import { MAZE_GHOST_SOLIDS, cellCenterX, cellCenterY } from "./maze";
import { BLINKY_SCATTER_COL, BLINKY_SCATTER_ROW } from "./ghostTarget";

describe("ghostPath", () => {
  it("prefers the neighbor closer to the target", () => {
    const x = cellCenterX(6);
    const y = cellCenterY(5);
    const dir = pickGhostDirection({
      x,
      y,
      facing: GHOST_DIR.left,
      targetCol: 6,
      targetRow: 1,
      solids: MAZE_GHOST_SOLIDS,
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
      solids: MAZE_GHOST_SOLIDS,
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
      solids: MAZE_GHOST_SOLIDS,
    });
    expect(dir).not.toBe(GHOST_DIR.left);
  });

  it("turns down at Blinky NE tip when facing into the wall", () => {
    const dir = pickGhostDirection({
      x: cellCenterX(26),
      y: cellCenterY(1),
      facing: GHOST_DIR.right,
      targetCol: BLINKY_SCATTER_COL,
      targetRow: BLINKY_SCATTER_ROW,
      solids: MAZE_GHOST_SOLIDS,
    });
    expect(dir).toBe(GHOST_DIR.down);
  });

  it("turns down at row-1 west tip when facing into the wall", () => {
    const dir = pickGhostDirection({
      x: cellCenterX(15),
      y: cellCenterY(1),
      facing: GHOST_DIR.left,
      targetCol: BLINKY_SCATTER_COL,
      targetRow: BLINKY_SCATTER_ROW,
      solids: MAZE_GHOST_SOLIDS,
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
        targetCol: BLINKY_SCATTER_COL,
        targetRow: BLINKY_SCATTER_ROW,
        solids: MAZE_GHOST_SOLIDS,
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
});
