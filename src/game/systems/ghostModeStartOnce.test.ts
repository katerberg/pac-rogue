import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { createGhostModeClock, startGhostModeClock, tickGhostMode } from "../../domain/ghostMode";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { getActiveLayout, cellCenterX, cellCenterY } from "../../domain/maze";
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
  const exit = getActiveLayout().ghostHouseExit;
  Position.x[ghost] = cellCenterX(exit.col);
  Position.y[ghost] = cellCenterY(exit.row);
  GhostPhase.value[ghost] = GHOST_PHASE.leaving;
  return { world, ghost };
}

describe("ghost mode clock start-once", () => {
  it("does not restart when a second ghost becomes active", () => {
    let mode = createGhostModeClock(2);
    const first = spawnLeavingAtExit();
    expect(ghostExitHouse(first.world)).toBe(true);
    if (!mode.active) {
      mode = startGhostModeClock(2);
    }
    const afterFirst = tickGhostMode(mode, 500);
    mode = afterFirst.clock;
    expect(mode.active).toBe(true);
    expect(mode.elapsedMs).toBe(500);

    const second = spawnLeavingAtExit();
    expect(ghostExitHouse(second.world)).toBe(true);
    if (!mode.active) {
      mode = startGhostModeClock(2);
    }
    expect(mode.elapsedMs).toBe(500);
  });
});
