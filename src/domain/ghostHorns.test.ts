import { describe, expect, it } from "vitest";
import { ghostHornRects, ghostHornTarget, stepGhostHornTurn } from "./ghostHorns";
import { GHOST_DIR } from "./ghostPath";
import { GHOST_PUPIL_TURN_MS } from "./ghostPupils";

describe("ghostHornTarget", () => {
  it("leans left only when facing left, right when facing right", () => {
    expect(ghostHornTarget(GHOST_DIR.left, 0)).toBe(1);
    expect(ghostHornTarget(GHOST_DIR.right, 1)).toBe(0);
  });

  it("keeps the last horizontal lean when facing vertically or none", () => {
    for (const facing of [GHOST_DIR.up, GHOST_DIR.down, GHOST_DIR.none]) {
      expect(ghostHornTarget(facing, 1)).toBe(1);
      expect(ghostHornTarget(facing, 0)).toBe(0);
    }
  });
});

describe("stepGhostHornTurn", () => {
  it("starts rested on the right-facing art and snaps to a left spawn", () => {
    expect(stepGhostHornTurn(undefined, GHOST_DIR.none, 0).lean).toBe(0);
    expect(stepGhostHornTurn(undefined, GHOST_DIR.left, 0).lean).toBe(1);
  });

  it("eases between leans over the turn duration", () => {
    const first = stepGhostHornTurn(undefined, GHOST_DIR.right, 0);
    const turning = stepGhostHornTurn(first.state, GHOST_DIR.left, 100);
    expect(turning.lean).toBe(0);
    const mid = stepGhostHornTurn(turning.state, GHOST_DIR.left, 100 + GHOST_PUPIL_TURN_MS / 2);
    expect(mid.lean).toBeGreaterThan(0);
    expect(mid.lean).toBeLessThan(1);
    const done = stepGhostHornTurn(mid.state, GHOST_DIR.left, 100 + GHOST_PUPIL_TURN_MS);
    expect(done.lean).toBe(1);
  });

  it("does not restart the turn while the target is unchanged", () => {
    const first = stepGhostHornTurn(undefined, GHOST_DIR.right, 0);
    const turning = stepGhostHornTurn(first.state, GHOST_DIR.left, 0);
    const again = stepGhostHornTurn(turning.state, GHOST_DIR.left, 50);
    expect(again.state).toBe(turning.state);
  });
});

describe("ghostHornRects", () => {
  it("draws a tip and base for each horn at the baked art positions when leaning right", () => {
    expect(ghostHornRects(8, 8, 16, 0)).toEqual([
      { x: 2, y: 0, w: 2, h: 1 },
      { x: 2, y: 1, w: 3, h: 1 },
      { x: 11, y: 0, w: 2, h: 1 },
      { x: 11, y: 1, w: 3, h: 1 },
    ]);
  });

  it("shifts only the tips one art pixel when leaning left and scales with size", () => {
    const rects = ghostHornRects(16, 16, 32, 1);
    expect(rects.map((r) => r.x)).toEqual([6, 4, 24, 22]);
    expect(rects[0]).toMatchObject({ y: 0, w: 4, h: 2 });
  });
});
