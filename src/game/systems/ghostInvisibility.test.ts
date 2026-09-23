import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  INVISIBILITY_CYCLE_MS,
  INVISIBILITY_HIDDEN_MS,
  TELEGRAPH_FLASH_MS,
  createRunCorruption,
} from "../../domain/corruption";
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { tickInvisibility } from "./ghostInvisibility";

function buildWorld(ghostCol: number, ghostRow: number, playerCol: number, playerRow: number) {
  const world = createWorld();

  const player = addEntity(world);
  addComponent(world, player, Player);
  addComponent(world, player, Position);
  Position.x[player] = cellCenterX(playerCol);
  Position.y[player] = cellCenterY(playerRow);

  const ghost = addEntity(world);
  addComponent(world, ghost, Ghost);
  addComponent(world, ghost, GhostKind);
  addComponent(world, ghost, GhostPhase);
  addComponent(world, ghost, Position);
  GhostKind.kind[ghost] = GHOST_KIND.inky;
  GhostPhase.value[ghost] = GHOST_PHASE.active;
  Position.x[ghost] = cellCenterX(ghostCol);
  Position.y[ghost] = cellCenterY(ghostRow);

  return { world, ghost, player };
}

function corrupted() {
  return {
    ...createRunCorruption({ type: null, ghostKind: null }),
    type: "invisibility" as const,
    ghostKind: GHOST_KIND.inky,
  };
}

describe("tickInvisibility", () => {
  it("no-ops for a different corruption type", () => {
    const { world } = buildWorld(6, 5, 20, 20);
    const state = createRunCorruption({ type: "speedSurge", ghostKind: GHOST_KIND.inky });
    const result = tickInvisibility(world, state, 100);
    expect(result).toEqual({ corruption: state, hiddenGhostEid: null, flashGhostEid: null });
  });

  it("flashes before going hidden, then hides while far from the player", () => {
    const { world, ghost } = buildWorld(6, 5, 20, 20);

    const flashing = tickInvisibility(world, corrupted(), TELEGRAPH_FLASH_MS - 1);
    expect(flashing.flashGhostEid).toBe(ghost);
    expect(flashing.hiddenGhostEid).toBeNull();

    const hidden = tickInvisibility(world, flashing.corruption, 2);
    expect(hidden.flashGhostEid).toBeNull();
    expect(hidden.hiddenGhostEid).toBe(ghost);
  });

  it("stays visible while hidden-phase but within the reveal radius of the player", () => {
    const { world } = buildWorld(6, 5, 7, 5);
    const flashing = tickInvisibility(world, corrupted(), TELEGRAPH_FLASH_MS - 1);
    const stillNear = tickInvisibility(world, flashing.corruption, 2);
    expect(stillNear.hiddenGhostEid).toBeNull();
    expect(stillNear.corruption.type).toBe("invisibility");
  });

  it("goes visible again after the hidden window", () => {
    const { world } = buildWorld(6, 5, 20, 20);
    const afterHidden = tickInvisibility(
      world,
      corrupted(),
      TELEGRAPH_FLASH_MS + INVISIBILITY_HIDDEN_MS + 1,
    );
    expect(afterHidden.hiddenGhostEid).toBeNull();
    expect(afterHidden.flashGhostEid).toBeNull();
  });

  it("wraps the cycle back to flashing", () => {
    const { world, ghost } = buildWorld(6, 5, 20, 20);
    const wrapped = tickInvisibility(world, corrupted(), INVISIBILITY_CYCLE_MS + 1);
    expect(wrapped.flashGhostEid).toBe(ghost);
  });
});
