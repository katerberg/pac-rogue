import { addComponent, addEntity, createWorld } from "bitecs";
import { afterEach, describe, expect, it } from "vitest";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { activateLayout, cellCenterX, cellCenterY } from "../../domain/maze";
import { speedTileScale } from "../../domain/playfield";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { applyGhostSpeed } from "./ghostSpeed";

function spawnGhost(
  world: ReturnType<typeof createWorld>,
  phase: GhostPhaseValue,
  kind: GhostKindId = GHOST_KIND.pinky,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostKind);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Position);
  addComponent(world, eid, Speed);
  GhostKind.kind[eid] = kind;
  GhostPhase.value[eid] = phase;
  Position.x[eid] = cellCenterX(13);
  Position.y[eid] = cellCenterY(14);
  Speed.px[eid] = 99;
  return eid;
}

describe("applyGhostSpeed", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("applies ghostSpeedMul after resolved speed", () => {
    const world = createWorld();
    const eid = spawnGhost(world, GHOST_PHASE.active);
    applyGhostSpeed(world, 100, { ghostSpeedMul: 0.75 });
    expect(Speed.px[eid]).toBeCloseTo(GHOST_SPEED * 0.75);
  });

  it("zeros only the frozen ghost", () => {
    const world = createWorld();
    const frozen = spawnGhost(world, GHOST_PHASE.active);
    const other = spawnGhost(world, GHOST_PHASE.leaving);
    applyGhostSpeed(world, 100, { ghostSpeedMul: 0.75, frozenGhostEid: frozen });
    expect(Speed.px[frozen]).toBe(0);
    expect(Speed.px[other]).toBeCloseTo(GHOST_SPEED * 0.75);
  });

  it("leaves inHouse speed untouched (owned by seating)", () => {
    const world = createWorld();
    const eid = spawnGhost(world, GHOST_PHASE.inHouse);
    applyGhostSpeed(world, 100);
    expect(Speed.px[eid]).toBe(99);
  });

  it("scales speed with the active layout's tile size so tiles-per-second stays constant", () => {
    activateLayout("mazeSmall");
    const world = createWorld();
    const eid = spawnGhost(world, GHOST_PHASE.active);
    applyGhostSpeed(world, 100);
    expect(speedTileScale()).toBeGreaterThan(1);
    expect(Speed.px[eid]).toBeCloseTo(GHOST_SPEED * speedTileScale());
  });

  it("applies the speed surge multiplier only to the matching ghost kind", () => {
    const world = createWorld();
    const surged = spawnGhost(world, GHOST_PHASE.active, GHOST_KIND.clyde);
    const other = spawnGhost(world, GHOST_PHASE.active, GHOST_KIND.inky);
    applyGhostSpeed(world, 100, { speedSurge: { ghostKind: GHOST_KIND.clyde, mul: 1.6 } });
    expect(Speed.px[surged]).toBeCloseTo(GHOST_SPEED * 1.6);
    expect(Speed.px[other]).toBeCloseTo(GHOST_SPEED);
  });
});
