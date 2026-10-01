import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { GHOST_PHASE, type GhostPhaseValue } from "../../domain/ghostPhase";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  playerFarthestFromGhostsSpawn,
} from "../../domain/maze";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { warpPlayerFarthestFromGhosts } from "./playerWarp";

function setup() {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  Position.x[eid] = cellCenterX(1);
  Position.y[eid] = cellCenterY(29);
  Velocity.x[eid] = 5;
  Velocity.y[eid] = -2;
  Input.direction[eid] = DIRECTION.right;
  Facing.direction[eid] = DIRECTION.right;
  const addGhost = (x: number, y: number, phase: GhostPhaseValue) => {
    const ghost = addEntity(world);
    addComponent(world, ghost, Ghost);
    addComponent(world, ghost, GhostPhase);
    addComponent(world, ghost, Position);
    Position.x[ghost] = x;
    Position.y[ghost] = y;
    GhostPhase.value[ghost] = phase;
  };
  return { world, eid, addGhost };
}

describe("warpPlayerFarthestFromGhosts", () => {
  it("moves the player to the tile farthest from active ghosts, clearing velocity but keeping facing/input", () => {
    const { world, eid, addGhost } = setup();
    const ghost = { x: Position.x[eid]!, y: Position.y[eid]! };
    addGhost(ghost.x, ghost.y, GHOST_PHASE.active);

    const glide = warpPlayerFarthestFromGhosts(world);

    const spawn = playerFarthestFromGhostsSpawn([ghost]);
    expect(glide).toEqual({ from: ghost, to: spawn, elapsedMs: 0 });
    expect(Position.x[eid]).toBe(spawn.x);
    expect(Position.y[eid]).toBe(spawn.y);
    expect(spawn).not.toEqual(ghost);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
    expect(Input.direction[eid]).toBe(DIRECTION.right);
    expect(Facing.direction[eid]).toBe(DIRECTION.right);
  });

  it("ignores in-house and leaving ghosts and falls back to the player spawn", () => {
    const { world, eid, addGhost } = setup();
    addGhost(Position.x[eid]!, Position.y[eid]!, GHOST_PHASE.inHouse);
    addGhost(Position.x[eid]!, Position.y[eid]!, GHOST_PHASE.leaving);

    warpPlayerFarthestFromGhosts(world);

    const { playerSpawn } = getActiveLayout();
    expect(Position.x[eid]).toBe(cellCenterX(playerSpawn.col));
    expect(Position.y[eid]).toBe(cellCenterY(playerSpawn.row));
  });

  it("no-ops without a player", () => {
    const world = createWorld();
    expect(warpPlayerFarthestFromGhosts(world)).toBeNull();
  });
});
