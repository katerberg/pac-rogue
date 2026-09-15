import { describe, expect, it } from "vitest";
import { GHOST_DIR, pickGhostDirection } from "./ghostPath";
import { MAZE_GHOST_SOLIDS, cellCenterX, cellCenterY } from "./maze";

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
});
