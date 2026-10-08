import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { ghostRadius, playerRadius } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { catchPlayer, GHOST_CATCH_MIN_OVERLAP_FRACTION } from "./catchPlayer";

function spawnPlayer(world: ReturnType<typeof createWorld>, x: number, y: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Player);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = playerRadius();
  return eid;
}

function spawnGhost(
  world: ReturnType<typeof createWorld>,
  x: number,
  y: number,
  phase: GhostPhaseValue,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  GhostPhase.value[eid] = phase;
  Drawable.radius[eid] = ghostRadius();
  return eid;
}

describe("catchPlayer", () => {
  it("does not catch when the ghost is still in the house", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    spawnGhost(world, 100, 100, GHOST_PHASE.inHouse);
    expect(catchPlayer(world)).toBeNull();
  });

  it("returns the catching ghost when an active ghost overlaps the player", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    const ghost = spawnGhost(world, 100, 100, GHOST_PHASE.active);
    expect(catchPlayer(world)).toBe(ghost);
  });

  it("catches when a leaving ghost overlaps the player", () => {
    const world = createWorld();
    spawnPlayer(world, 200, 200);
    spawnGhost(world, 200 + playerRadius() / 2, 200, GHOST_PHASE.leaving);
    expect(catchPlayer(world)).not.toBeNull();
  });

  it("does not catch when an active ghost is far away", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    spawnGhost(world, 400, 400, GHOST_PHASE.active);
    expect(catchPlayer(world)).toBeNull();
  });

  it("does not catch when overlapping the frozen ghost", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    const frozen = spawnGhost(world, 100, 100, GHOST_PHASE.active);
    expect(catchPlayer(world, { frozenGhostEid: frozen })).toBeNull();
  });

  it("still catches an unfrozen ghost while another is frozen", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    const frozen = spawnGhost(world, 400, 400, GHOST_PHASE.active);
    spawnGhost(world, 100, 100, GHOST_PHASE.active);
    expect(catchPlayer(world, { frozenGhostEid: frozen })).not.toBeNull();
  });

  it("does not catch when the player is invulnerable", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    spawnGhost(world, 100, 100, GHOST_PHASE.active);
    expect(catchPlayer(world, { playerInvulnerable: true })).toBeNull();
  });

  it("does not catch on a graze that falls short of the required overlap", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    const reach = (playerRadius() + ghostRadius()) * (1 - GHOST_CATCH_MIN_OVERLAP_FRACTION);
    spawnGhost(world, 100 + reach + 0.5, 100, GHOST_PHASE.active);
    expect(catchPlayer(world)).toBeNull();
  });

  it("catches once the ghost clears the required overlap threshold", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    const reach = (playerRadius() + ghostRadius()) * (1 - GHOST_CATCH_MIN_OVERLAP_FRACTION);
    spawnGhost(world, 100 + reach - 0.5, 100, GHOST_PHASE.active);
    expect(catchPlayer(world)).not.toBeNull();
  });
});
