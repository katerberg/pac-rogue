import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { PLAYER_SPEED } from "../../domain/playfield";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { movement } from "./movement";

/** Open corridor cell on row 1 (top lane). */
function spawnAt(col: number, row: number) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  addComponent(world, eid, Facing);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Input.direction[eid] = DIRECTION.none;
  Facing.direction[eid] = DIRECTION.none;
  return { world, eid };
}

describe("movement", () => {
  it("adopts sticky Input into Facing when aligned and path is open", () => {
    const { world, eid } = spawnAt(1, 1);
    Input.direction[eid] = DIRECTION.right;

    movement(world, 16);

    expect(Facing.direction[eid]).toBe(DIRECTION.right);
    expect(Velocity.x[eid]).toBe(PLAYER_SPEED);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.x[eid]).toBeGreaterThan(cellCenterX(1));
  });

  it("stops and clears Facing when moving into a solid neighbor", () => {
    const { world, eid } = spawnAt(1, 1);
    Facing.direction[eid] = DIRECTION.up;
    Input.direction[eid] = DIRECTION.up;

    movement(world, 100);

    expect(Facing.direction[eid]).toBe(DIRECTION.none);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.x[eid]).toBe(cellCenterX(1));
    expect(Position.y[eid]).toBe(cellCenterY(1));
  });

  it("keeps traveling on Facing when sticky Input is blocked", () => {
    const { world, eid } = spawnAt(1, 1);
    Facing.direction[eid] = DIRECTION.right;
    Input.direction[eid] = DIRECTION.up; // wall above — cannot turn yet

    movement(world, 16);

    expect(Facing.direction[eid]).toBe(DIRECTION.right);
    expect(Velocity.x[eid]).toBe(PLAYER_SPEED);
  });

  it("does not clear sticky Input when stopped", () => {
    const { world, eid } = spawnAt(1, 1);
    Input.direction[eid] = DIRECTION.up;
    Facing.direction[eid] = DIRECTION.none;

    movement(world, 16);

    expect(Input.direction[eid]).toBe(DIRECTION.up);
    expect(Facing.direction[eid]).toBe(DIRECTION.none);
    expect(Velocity.x[eid]).toBe(0);
    expect(Velocity.y[eid]).toBe(0);
  });
});
