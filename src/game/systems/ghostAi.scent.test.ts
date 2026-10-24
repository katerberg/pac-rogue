import { describe, expect, it } from "vitest";
import { GHOST_DIR } from "../../domain/ghostPath";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { ghostMovementRules } from "../../domain/ghostMovement";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { DIRECTION } from "../components/Input";
import { scentRouteDir } from "./ghostAi";

describe("scentRouteDir", () => {
  const rules = ghostMovementRules(GHOST_PHASE.active);
  const field = { zones: [{ col: 26, row: 29 }], radiusTiles: 4 };
  const x = cellCenterX(10);
  const y = cellCenterY(1);

  it("does not turn a ghost around in a corridor that still leads forward", () => {
    const dir = scentRouteDir(x, y, { col: 1, row: 1 }, rules, field, GHOST_DIR.right);
    expect(dir).not.toBe(DIRECTION.left);
  });

  it("still routes backwards when the ghost has no other way to go", () => {
    const dir = scentRouteDir(x, y, { col: 1, row: 1 }, rules, field, GHOST_DIR.left);
    expect(dir).toBe(DIRECTION.left);
  });
});
