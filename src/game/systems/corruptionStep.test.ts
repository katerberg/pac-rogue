import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { createRunCorruption, TELEGRAPH_FLASH_MS } from "../../domain/corruption";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { activateLayout, cellCenterX, cellCenterY } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { stepCorruption } from "./corruptionStep";

function worldWithPinky() {
  activateLayout("mazeSmall");
  const world = createWorld();
  const eid = addEntity(world);
  for (const c of [Ghost, GhostKind, GhostPhase, Position]) {
    addComponent(world, eid, c);
  }
  GhostKind.kind[eid] = GHOST_KIND.pinky;
  GhostPhase.value[eid] = GHOST_PHASE.active;
  Position.x[eid] = cellCenterX(1);
  Position.y[eid] = cellCenterY(1);
  return { world, eid };
}

describe("stepCorruption flash", () => {
  it("flashes the corrupted ghost during the pellet-drop telegraph", () => {
    const { world, eid } = worldWithPinky();
    const state = {
      ...createRunCorruption({ type: null, ghostKind: null }),
      type: "pelletDropper" as const,
      ghostKind: GHOST_KIND.pinky,
      pelletDropperFlashMs: TELEGRAPH_FLASH_MS,
    };
    expect(stepCorruption(world, state, 16, 10).flashGhostEid).toBe(eid);
  });

  it("does not flash when nothing is pending", () => {
    const { world } = worldWithPinky();
    const state = {
      ...createRunCorruption({ type: null, ghostKind: null }),
      type: "slimeTrail" as const,
      ghostKind: GHOST_KIND.pinky,
    };
    expect(stepCorruption(world, state, 16, 10).flashGhostEid).toBeNull();
  });
});
