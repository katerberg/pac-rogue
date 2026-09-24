import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { PLAYER_SPEED } from "../../domain/playfield";
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
  it("resolves the level-1 base speed (80% of player) before ghostSpeedMul", () => {
    const world = createWorld();
    const eid = spawnGhost(world, GHOST_PHASE.active);
    applyGhostSpeed(world, 100, 1, { ghostSpeedMul: 0.75 });
    expect(Speed.px[eid]).toBeCloseTo(PLAYER_SPEED * 0.8 * 0.75);
  });

  it("resolves the level-5 base speed (100% of player, ratio pinned)", () => {
    const world = createWorld();
    const eid = spawnGhost(world, GHOST_PHASE.active);
    applyGhostSpeed(world, 100, 5, { ghostSpeedMul: 0.75 });
    expect(Speed.px[eid]).toBeCloseTo(PLAYER_SPEED * 1 * 0.75);
  });

  it("zeros only the frozen ghost", () => {
    const world = createWorld();
    const frozen = spawnGhost(world, GHOST_PHASE.active);
    const other = spawnGhost(world, GHOST_PHASE.leaving);
    applyGhostSpeed(world, 100, 1, { ghostSpeedMul: 0.75, frozenGhostEid: frozen });
    expect(Speed.px[frozen]).toBe(0);
    expect(Speed.px[other]).toBeCloseTo(PLAYER_SPEED * 0.8 * 0.75);
  });

  it("leaves inHouse speed untouched (owned by seating)", () => {
    const world = createWorld();
    const eid = spawnGhost(world, GHOST_PHASE.inHouse);
    applyGhostSpeed(world, 100, 1);
    expect(Speed.px[eid]).toBe(99);
  });

  it("applies the speed surge multiplier only to the matching ghost kind", () => {
    const world = createWorld();
    const surged = spawnGhost(world, GHOST_PHASE.active, GHOST_KIND.clyde);
    const other = spawnGhost(world, GHOST_PHASE.active, GHOST_KIND.inky);
    applyGhostSpeed(world, 100, 1, { speedSurge: { ghostKind: GHOST_KIND.clyde, mul: 1.6 } });
    expect(Speed.px[surged]).toBeCloseTo(PLAYER_SPEED * 0.8 * 1.6);
    expect(Speed.px[other]).toBeCloseTo(PLAYER_SPEED * 0.8);
  });
});
