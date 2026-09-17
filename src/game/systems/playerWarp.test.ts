import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, playerTopCenterSpawn } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { warpPlayerToTopCenter } from "./playerWarp";

describe("warpPlayerToTopCenter", () => {
  it("moves the player to top-center and clears velocity while keeping facing/input", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Position);
    addComponent(world, eid, Velocity);
    addComponent(world, eid, Input);
    addComponent(world, eid, Facing);
    Position.x[eid] = cellCenterX(13);
    Position.y[eid] = cellCenterY(23);
    Velocity.x[eid] = 5;
    Velocity.y[eid] = -2;
    Input.direction[eid] = DIRECTION.right;
    Facing.direction[eid] = DIRECTION.right;

    warpPlayerToTopCenter(world);

    const spawn = playerTopCenterSpawn();
    expect(Position.x[eid]).toBe(spawn.x);
    expect(Position.y[eid]).toBe(spawn.y);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
    expect(Input.direction[eid]).toBe(DIRECTION.right);
    expect(Facing.direction[eid]).toBe(DIRECTION.right);
  });

  it("no-ops without a player", () => {
    const world = createWorld();
    expect(() => warpPlayerToTopCenter(world)).not.toThrow();
  });
});
