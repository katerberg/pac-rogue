import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "../../domain/ghostKind";
import { ghostHouseSeatCenters } from "../../domain/ghostHouseSeats";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import { createGhostReleaseClock } from "../../domain/ghostRelease";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { recallClosestGhostToHouse } from "./ghostRecall";

function spawnGhost(
  world: ReturnType<typeof createWorld>,
  col: number,
  row: number,
  phase: GhostPhaseValue,
  kind: number = GHOST_KIND.blinky,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, GhostKind);
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
  GhostKind.kind[eid] = kind;
  GhostPhase.value[eid] = phase;
  Ghost.decidedCol[eid] = col;
  Ghost.decidedRow[eid] = row;
  return eid;
}

function spawnPlayer(world: ReturnType<typeof createWorld>, col: number, row: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return eid;
}

const idleClock = createGhostReleaseClock();

describe("recallClosestGhostToHouse", () => {
  it("teleports the closest eligible ghost into an inHouse seat", () => {
    const world = createWorld();
    spawnPlayer(world, 1, 1);
    const far = spawnGhost(world, 26, 1, GHOST_PHASE.active, GHOST_KIND.pinky);
    const near = spawnGhost(world, 6, 5, GHOST_PHASE.active, GHOST_KIND.blinky);
    const house = spawnGhost(world, 1, 1, GHOST_PHASE.inHouse, GHOST_KIND.clyde);

    recallClosestGhostToHouse(world, idleClock, 0, false);

    const seats = ghostHouseSeatCenters();
    expect(GhostPhase.value[near]).toBe(GHOST_PHASE.inHouse);
    expect(Speed.px[near]).toBe(0);
    expect(Velocity.x[near]).toBe(0);
    expect(Velocity.y[near]).toBe(0);
    expect(Number.isNaN(Ghost.decidedCol[near])).toBe(true);
    expect(seats.some((s) => s.x === Position.x[near] && s.y === Position.y[near])).toBe(true);
    expect(seats.some((s) => s.x === Position.x[house] && s.y === Position.y[house])).toBe(true);
    expect(Position.x[near]).not.toBe(Position.x[house]);

    expect(Position.x[far]).toBe(cellCenterX(26));
    expect(GhostPhase.value[house]).toBe(GHOST_PHASE.inHouse);
  });

  it("no-ops when only inHouse ghosts exist", () => {
    const world = createWorld();
    spawnPlayer(world, 1, 1);
    const eid = spawnGhost(world, 6, 5, GHOST_PHASE.inHouse);
    const x = Position.x[eid];
    recallClosestGhostToHouse(world, idleClock, 0, false);
    expect(Position.x[eid]).toBe(x);
    expect(GhostPhase.value[eid]).toBe(GHOST_PHASE.inHouse);
  });

  it("no-ops without a player", () => {
    const world = createWorld();
    const eid = spawnGhost(world, 6, 5, GHOST_PHASE.active);
    const x = Position.x[eid];
    recallClosestGhostToHouse(world, idleClock, 0, false);
    expect(Position.x[eid]).toBe(x);
  });
});
