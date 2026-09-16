import { addComponent, addEntity, createWorld, type World } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import {
  BLINKY_RELEASE_DELAY_MS,
  CLYDE_RELEASE_PELLETS,
  PINKY_RELEASE_DELAY_MS,
  createGhostReleaseClock,
  tickGhostRelease,
} from "../../domain/ghostRelease";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { ghostHouseSpawnCenter } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { ghostRelease } from "./ghostRelease";

function spawnHouseGhost(kind: number, world: World = createWorld()) {
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  addComponent(world, eid, Speed);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostKind);
  addComponent(world, eid, GhostPhase);
  const spawn = ghostHouseSpawnCenter();
  Position.x[eid] = spawn.x;
  Position.y[eid] = spawn.y;
  Input.direction[eid] = DIRECTION.none;
  Facing.direction[eid] = DIRECTION.none;
  Speed.px[eid] = 0;
  GhostKind.kind[eid] = kind;
  GhostPhase.value[eid] = GHOST_PHASE.inHouse;
  return { world, eid };
}

describe("ghostRelease per kind", () => {
  it("releases Blinky before Pinky on the shared clock", () => {
    const { world, eid: blinky } = spawnHouseGhost(GHOST_KIND.blinky);
    const { eid: pinky } = spawnHouseGhost(GHOST_KIND.pinky, world);

    let clock = tickGhostRelease(createGhostReleaseClock(), true, BLINKY_RELEASE_DELAY_MS);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[pinky]).toBe(GHOST_PHASE.inHouse);

    clock = tickGhostRelease(clock, true, PINKY_RELEASE_DELAY_MS - BLINKY_RELEASE_DELAY_MS);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[pinky]).toBe(GHOST_PHASE.leaving);
  });

  it("keeps Clyde in house when timers fire with zero pellets", () => {
    const { world, eid: blinky } = spawnHouseGhost(GHOST_KIND.blinky);
    const { eid: pinky } = spawnHouseGhost(GHOST_KIND.pinky, world);
    const { eid: clyde } = spawnHouseGhost(GHOST_KIND.clyde, world);
    const clock = tickGhostRelease(createGhostReleaseClock(), true, PINKY_RELEASE_DELAY_MS);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[pinky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.inHouse);
  });

  it("releases only Clyde when the pellet gate fires before Blinky's delay", () => {
    const { world, eid: blinky } = spawnHouseGhost(GHOST_KIND.blinky);
    const { eid: pinky } = spawnHouseGhost(GHOST_KIND.pinky, world);
    const { eid: clyde } = spawnHouseGhost(GHOST_KIND.clyde, world);
    const clock = createGhostReleaseClock();
    ghostRelease(world, clock, CLYDE_RELEASE_PELLETS);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.inHouse);
    expect(GhostPhase.value[pinky]).toBe(GHOST_PHASE.inHouse);
  });

  it("does nothing before the clock starts for time-based ghosts", () => {
    const { world, eid } = spawnHouseGhost(GHOST_KIND.blinky);
    ghostRelease(world, createGhostReleaseClock(), 0);
    expect(GhostPhase.value[eid]).toBe(GHOST_PHASE.inHouse);
  });
});
