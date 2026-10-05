import { addComponent, addEntity, createWorld, type World } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import {
  BLINKY_RELEASE_DELAY_MS,
  IDLE_RELEASE_MS,
  createGhostReleaseClock,
  tickGhostRelease,
} from "../../domain/ghostRelease";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import {
  BASE_CLYDE_RELEASE_PELLETS,
  BASE_INKY_RELEASE_PELLETS,
  ghostHouseSpawnCenter,
} from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
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
  function fourGhosts() {
    const { world, eid: blinky } = spawnHouseGhost(GHOST_KIND.blinky);
    const { eid: pinky } = spawnHouseGhost(GHOST_KIND.pinky, world);
    const { eid: inky } = spawnHouseGhost(GHOST_KIND.inky, world);
    const { eid: clyde } = spawnHouseGhost(GHOST_KIND.clyde, world);
    return { world, blinky, pinky, inky, clyde };
  }

  it("level 1: releases Pinky on first input, then Blinky after his delay", () => {
    const { world, blinky, pinky } = fourGhosts();
    let clock = tickGhostRelease(createGhostReleaseClock(1), true, 1);
    expect(ghostRelease(world, clock, 0)).toBe(true);
    expect(GhostPhase.value[pinky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.inHouse);

    clock = tickGhostRelease(clock, true, BLINKY_RELEASE_DELAY_MS);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.leaving);
  });

  it("level 1: keeps Inky and Clyde in house with zero dots", () => {
    const { world, inky, clyde } = fourGhosts();
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, 1000);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[inky]).toBe(GHOST_PHASE.inHouse);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.inHouse);
  });

  it("level 1: releases Inky at the Inky dot count and Clyde at the Clyde dot count", () => {
    const { world, inky, clyde } = fourGhosts();
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, 1);
    ghostRelease(world, clock, BASE_INKY_RELEASE_PELLETS);
    expect(GhostPhase.value[inky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.inHouse);
    ghostRelease(world, clock, BASE_CLYDE_RELEASE_PELLETS);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.leaving);
  });

  it("level 3: releases all four without eating once Blinky's delay passes", () => {
    const { world, blinky, pinky, inky, clyde } = fourGhosts();
    const clock = tickGhostRelease(createGhostReleaseClock(3), true, BLINKY_RELEASE_DELAY_MS);
    ghostRelease(world, clock, 0);
    for (const eid of [blinky, pinky, inky, clyde]) {
      expect(GhostPhase.value[eid]).toBe(GHOST_PHASE.leaving);
    }
  });

  it("does nothing before the clock starts", () => {
    const { world, blinky, pinky } = fourGhosts();
    expect(ghostRelease(world, createGhostReleaseClock(3), 0)).toBe(false);
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.inHouse);
    expect(GhostPhase.value[pinky]).toBe(GHOST_PHASE.inHouse);
  });

  it("idle expiry pushes out exactly one waiting ghost: Inky before Clyde", () => {
    const { world, blinky, pinky, inky, clyde } = fourGhosts();
    GhostPhase.value[blinky] = GHOST_PHASE.active;
    GhostPhase.value[pinky] = GHOST_PHASE.active;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, IDLE_RELEASE_MS);
    expect(ghostRelease(world, clock, 0)).toBe(true);
    expect(GhostPhase.value[inky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.inHouse);
  });

  it("idle expiry does not release before the limit", () => {
    const { world, blinky, pinky, inky } = fourGhosts();
    GhostPhase.value[blinky] = GHOST_PHASE.active;
    GhostPhase.value[pinky] = GHOST_PHASE.active;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, IDLE_RELEASE_MS - 1);
    expect(ghostRelease(world, clock, 0)).toBe(false);
    expect(GhostPhase.value[inky]).toBe(GHOST_PHASE.inHouse);
  });

  it("idle expiry skips boss ghosts", () => {
    const { world, eid } = spawnHouseGhost(GHOST_KIND.blinky);
    addComponent(world, eid, BossGhost);
    BossGhost.releaseDelayMs[eid] = 60_000;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, IDLE_RELEASE_MS);
    expect(ghostRelease(world, clock, 0)).toBe(false);
    expect(GhostPhase.value[eid]).toBe(GHOST_PHASE.inHouse);
  });

  it("keeps the held ghost in the house even when its gate has passed", () => {
    const { world, blinky, pinky, inky, clyde } = fourGhosts();
    const clock = tickGhostRelease(createGhostReleaseClock(3), true, BLINKY_RELEASE_DELAY_MS);
    ghostRelease(world, clock, 0, false, { heldGhostEid: blinky });
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.inHouse);
    for (const eid of [pinky, inky, clyde]) {
      expect(GhostPhase.value[eid]).toBe(GHOST_PHASE.leaving);
    }
  });

  it("idle expiry skips the held ghost and pushes out the next one", () => {
    const { world, blinky, pinky, inky, clyde } = fourGhosts();
    GhostPhase.value[blinky] = GHOST_PHASE.active;
    GhostPhase.value[pinky] = GHOST_PHASE.active;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, IDLE_RELEASE_MS);
    expect(ghostRelease(world, clock, 0, false, { heldGhostEid: inky })).toBe(true);
    expect(GhostPhase.value[inky]).toBe(GHOST_PHASE.inHouse);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.leaving);
  });
});
