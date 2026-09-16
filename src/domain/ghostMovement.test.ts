import { describe, expect, it } from "vitest";
import { GHOST_DIR } from "./ghostPath";
import { ghostMovementRules } from "./ghostMovement";
import { GHOST_PHASE } from "./ghostPhase";
import { cellCenterX, cellCenterY } from "./maze";

describe("ghostMovementRules", () => {
  it("redirects reverse intent to the L-turn at the NE tip", () => {
    const rules = ghostMovementRules(GHOST_PHASE.active);
    const resolved = rules.resolveReverse(
      cellCenterX(26),
      cellCenterY(1),
      GHOST_DIR.right,
      GHOST_DIR.left,
    );
    expect(resolved.facing).toBe(GHOST_DIR.down);
    expect(resolved.intent).toBe(GHOST_DIR.down);
  });
});
