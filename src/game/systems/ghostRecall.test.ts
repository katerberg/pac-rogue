import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { cellCenterX, cellCenterY, ghostHouseSpawnCenter } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { recallClosestGhostToHouse } from "./ghostRecall";

function spawnGhost(
  world: ReturnType<typeof createWorld>,
  col: number,
  row: number,
  phase: GhostPhaseValue,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostPhase);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  addComponent(world, eid, Speed);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Velocity.x[eid] = 3;
  Velocity.y[eid] = 4;
  Input.direction[eid] = DIRECTION.left;
  Facing.direction[eid] = DIRECTION.left;
  Speed.px[eid] = 99;
  GhostPhase.value[eid] = phase;
  Ghost.decidedCol[eid] = col;
  Ghost.decidedRow[eid] = row;
  return eid;
}

describe("recallClosestGhostToHouse", () => {
  it("teleports the closest eligible ghost into the house as leaving", () => {
    const world = createWorld();
    const far = spawnGhost(world, 26, 1, GHOST_PHASE.active);
    const near = spawnGhost(world, 6, 5, GHOST_PHASE.active);
    const house = spawnGhost(world, 1, 1, GHOST_PHASE.inHouse);

    recallClosestGhostToHouse(world, cellCenterX(1), cellCenterY(1));

    const spawn = ghostHouseSpawnCenter();
    expect(Position.x[near]).toBe(spawn.x);
    expect(Position.y[near]).toBe(spawn.y);
    expect(GhostPhase.value[near]).toBe(GHOST_PHASE.leaving);
    expect(Input.direction[near]).toBe(DIRECTION.up);
    expect(Facing.direction[near]).toBe(DIRECTION.up);
    expect(Speed.px[near]).toBe(GHOST_SPEED);
    expect(Velocity.x[near]).toBe(0);
    expect(Velocity.y[near]).toBe(0);
    expect(Number.isNaN(Ghost.decidedCol[near])).toBe(true);

    expect(Position.x[far]).toBe(cellCenterX(26));
    expect(GhostPhase.value[house]).toBe(GHOST_PHASE.inHouse);
  });

  it("no-ops when only inHouse ghosts exist", () => {
    const world = createWorld();
    const eid = spawnGhost(world, 6, 5, GHOST_PHASE.inHouse);
    const x = Position.x[eid];
    recallClosestGhostToHouse(world, 0, 0);
    expect(Position.x[eid]).toBe(x);
    expect(GhostPhase.value[eid]).toBe(GHOST_PHASE.inHouse);
  });
});
