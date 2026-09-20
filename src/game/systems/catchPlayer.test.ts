import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { ghostRadius, playerRadius } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { catchPlayer } from "./catchPlayer";

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
    expect(catchPlayer(world)).toBe(false);
  });

  it("catches when an active ghost overlaps the player", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    spawnGhost(world, 100, 100, GHOST_PHASE.active);
    expect(catchPlayer(world)).toBe(true);
  });

  it("catches when a leaving ghost overlaps the player", () => {
    const world = createWorld();
    spawnPlayer(world, 200, 200);
    spawnGhost(world, 200 + playerRadius() / 2, 200, GHOST_PHASE.leaving);
    expect(catchPlayer(world)).toBe(true);
  });

  it("does not catch when an active ghost is far away", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    spawnGhost(world, 400, 400, GHOST_PHASE.active);
    expect(catchPlayer(world)).toBe(false);
  });

  it("does not catch when ghosts are frozen", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    spawnGhost(world, 100, 100, GHOST_PHASE.active);
    expect(catchPlayer(world, { ghostsFrozen: true })).toBe(false);
  });

  it("does not catch when the player is invulnerable", () => {
    const world = createWorld();
    spawnPlayer(world, 100, 100);
    spawnGhost(world, 100, 100, GHOST_PHASE.active);
    expect(catchPlayer(world, { playerInvulnerable: true })).toBe(false);
  });
});
