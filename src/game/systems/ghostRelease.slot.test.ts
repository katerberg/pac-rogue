import { addComponent, addEntity, createWorld, type World } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { RELEASE_SLOT } from "../../domain/ghostRoster";
import {
  ANCHOR_RELEASE_DELAY_MS,
  IDLE_RELEASE_MS,
  createGhostReleaseClock,
  tickGhostRelease,
} from "../../domain/ghostRelease";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import {
  BASE_RELIEF_RELEASE_PELLETS,
  BASE_FLANK_RELEASE_PELLETS,
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

function spawnHouseGhost(
  slot: number,
  world: World = createWorld(),
  kind: number = GHOST_KIND.blinky,
) {
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
  Ghost.releaseSlot[eid] = slot;
  GhostPhase.value[eid] = GHOST_PHASE.inHouse;
  return { world, eid };
}

describe("ghostRelease per slot", () => {
  function fourGhosts() {
    const { world, eid: blinky } = spawnHouseGhost(RELEASE_SLOT.anchor);
    const { eid: pinky } = spawnHouseGhost(RELEASE_SLOT.front, world);
    const { eid: inky } = spawnHouseGhost(RELEASE_SLOT.flank, world);
    const { eid: clyde } = spawnHouseGhost(RELEASE_SLOT.relief, world);
    return { world, blinky, pinky, inky, clyde };
  }

  it("level 1: releases Pinky on first input, then Blinky after his delay", () => {
    const { world, blinky, pinky } = fourGhosts();
    let clock = tickGhostRelease(createGhostReleaseClock(1), true, 1);
    expect(ghostRelease(world, clock, 0)).toBe(true);
    expect(GhostPhase.value[pinky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[blinky]).toBe(GHOST_PHASE.inHouse);

    clock = tickGhostRelease(clock, true, ANCHOR_RELEASE_DELAY_MS);
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
    ghostRelease(world, clock, BASE_FLANK_RELEASE_PELLETS);
    expect(GhostPhase.value[inky]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.inHouse);
    ghostRelease(world, clock, BASE_RELIEF_RELEASE_PELLETS);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.leaving);
  });

  it("level 3: releases all four without eating once Blinky's delay passes", () => {
    const { world, blinky, pinky, inky, clyde } = fourGhosts();
    const clock = tickGhostRelease(createGhostReleaseClock(3), true, ANCHOR_RELEASE_DELAY_MS);
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
    const { world, eid } = spawnHouseGhost(RELEASE_SLOT.anchor);
    addComponent(world, eid, BossGhost);
    BossGhost.releaseDelayMs[eid] = 60_000;
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, IDLE_RELEASE_MS);
    expect(ghostRelease(world, clock, 0)).toBe(false);
    expect(GhostPhase.value[eid]).toBe(GHOST_PHASE.inHouse);
  });

  it("keeps the held ghost in the house even when its gate has passed", () => {
    const { world, blinky, pinky, inky, clyde } = fourGhosts();
    const clock = tickGhostRelease(createGhostReleaseClock(3), true, ANCHOR_RELEASE_DELAY_MS);
    ghostRelease(world, clock, 0, false, { heldGhostEids: [blinky] });
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
    expect(ghostRelease(world, clock, 0, false, { heldGhostEids: [inky] })).toBe(true);
    expect(GhostPhase.value[inky]).toBe(GHOST_PHASE.inHouse);
    expect(GhostPhase.value[clyde]).toBe(GHOST_PHASE.leaving);
  });

  it("gates by slot, not by ghost: Wardy and Spunky take whichever slot they are given", () => {
    const { world, eid: flank } = spawnHouseGhost(
      RELEASE_SLOT.flank,
      createWorld(),
      GHOST_KIND.wardy,
    );
    const { eid: relief } = spawnHouseGhost(RELEASE_SLOT.relief, world, GHOST_KIND.spunky);
    const clock = tickGhostRelease(createGhostReleaseClock(1), true, 1);
    ghostRelease(world, clock, 0);
    expect(GhostPhase.value[flank]).toBe(GHOST_PHASE.inHouse);
    expect(GhostPhase.value[relief]).toBe(GHOST_PHASE.inHouse);
    ghostRelease(world, clock, BASE_FLANK_RELEASE_PELLETS);
    expect(GhostPhase.value[flank]).toBe(GHOST_PHASE.leaving);
    expect(GhostPhase.value[relief]).toBe(GHOST_PHASE.inHouse);
    ghostRelease(world, clock, BASE_RELIEF_RELEASE_PELLETS);
    expect(GhostPhase.value[relief]).toBe(GHOST_PHASE.leaving);
  });
});
