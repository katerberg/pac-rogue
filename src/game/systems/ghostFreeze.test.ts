import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { createRunUpgrades, FREEZE_MS } from "../../domain/upgrades";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { freezeClosestGhost } from "./ghostFreeze";

function spawnPlayer(world: ReturnType<typeof createWorld>, x: number, y: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Player);
  Position.x[eid] = x;
  Position.y[eid] = y;
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
  Position.x[eid] = x;
  Position.y[eid] = y;
  GhostPhase.value[eid] = phase;
  return eid;
}

describe("freezeClosestGhost", () => {
  it("freezes only the closest leaving/active ghost", () => {
    const world = createWorld();
    spawnPlayer(world, 0, 0);
    const near = spawnGhost(world, 10, 0, GHOST_PHASE.active);
    spawnGhost(world, 100, 0, GHOST_PHASE.active);
    spawnGhost(world, 5, 0, GHOST_PHASE.inHouse);

    const next = freezeClosestGhost(world, createRunUpgrades(), FREEZE_MS);
    expect(next.freezeRemainingMs).toBe(FREEZE_MS);
    expect(next.frozenGhostEid).toBe(near);
  });

  it("is a no-op when no eligible ghost exists", () => {
    const world = createWorld();
    spawnPlayer(world, 0, 0);
    spawnGhost(world, 10, 0, GHOST_PHASE.inHouse);
    const before = createRunUpgrades();
    expect(freezeClosestGhost(world, before, FREEZE_MS)).toEqual(before);
  });

  it("refreshes the timer onto a new closest target", () => {
    const world = createWorld();
    spawnPlayer(world, 0, 0);
    const near = spawnGhost(world, 10, 0, GHOST_PHASE.leaving);
    const prior = {
      ...createRunUpgrades(),
      freezeRemainingMs: 500,
      frozenGhostEid: 999,
    };
    const next = freezeClosestGhost(world, prior, FREEZE_MS);
    expect(next.freezeRemainingMs).toBe(FREEZE_MS);
    expect(next.frozenGhostEid).toBe(near);
  });
});
