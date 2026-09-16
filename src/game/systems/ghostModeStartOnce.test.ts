import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { createGhostModeClock, startGhostModeClock, tickGhostMode } from "../../domain/ghostMode";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  GHOST_HOUSE_EXIT_COL,
  GHOST_HOUSE_EXIT_ROW,
  cellCenterX,
  cellCenterY,
} from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { ghostExitHouse } from "./ghostExitHouse";

function spawnLeavingAtExit() {
  const world = createWorld();
  const ghost = addEntity(world);
  addComponent(world, ghost, Position);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostPhase);
  Position.x[ghost] = cellCenterX(GHOST_HOUSE_EXIT_COL);
  Position.y[ghost] = cellCenterY(GHOST_HOUSE_EXIT_ROW);
  GhostPhase.value[ghost] = GHOST_PHASE.leaving;
  return { world, ghost };
}

describe("ghost mode clock start-once", () => {
  it("does not restart when a second ghost becomes active", () => {
    let mode = createGhostModeClock();
    const first = spawnLeavingAtExit();
    expect(ghostExitHouse(first.world)).toBe(true);
    if (!mode.active) {
      mode = startGhostModeClock();
    }
    const afterFirst = tickGhostMode(mode, 500);
    mode = afterFirst.clock;
    expect(mode.active).toBe(true);
    expect(mode.elapsedMs).toBe(500);

    const second = spawnLeavingAtExit();
    expect(ghostExitHouse(second.world)).toBe(true);
    if (!mode.active) {
      mode = startGhostModeClock();
    }
    expect(mode.elapsedMs).toBe(500);
  });
});
