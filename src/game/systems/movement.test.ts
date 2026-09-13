import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
} from "../../domain/playfield";
import { DIRECTION, Input } from "../components/Input";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { movement } from "./movement";

function spawn(x = PLAYFIELD_WIDTH / 2, y = PLAYFIELD_HEIGHT / 2) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Position);
  addComponent(world, eid, Velocity);
  addComponent(world, eid, Input);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  Input.direction[eid] = DIRECTION.none;
  return { world, eid };
}

describe("movement", () => {
  it("sets Velocity from Input and integrates Position by v * dt", () => {
    const { world, eid } = spawn();
    Input.direction[eid] = DIRECTION.right;

    movement(world, 1000);

    expect(Velocity.x[eid]).toBe(PLAYER_SPEED);
    expect(Velocity.y[eid]).toBe(0);
    expect(Position.x[eid]).toBe(PLAYFIELD_WIDTH / 2 + PLAYER_SPEED);
    expect(Position.y[eid]).toBe(PLAYFIELD_HEIGHT / 2);
  });

  it("clamps Position so the sprite stays on the playfield", () => {
    const { world, eid } = spawn(PLAYFIELD_WIDTH - PLAYER_RADIUS - 1, PLAYER_RADIUS + 1);
    Input.direction[eid] = DIRECTION.right;

    movement(world, 5000);

    expect(Position.x[eid]).toBe(PLAYFIELD_WIDTH - PLAYER_RADIUS);
    expect(Position.y[eid]).toBe(PLAYER_RADIUS + 1);
  });

  it("replaces Velocity immediately when Input direction changes (turn on a dime)", () => {
    const { world, eid } = spawn();
    Input.direction[eid] = DIRECTION.right;
    movement(world, 16);
    expect(Velocity.x[eid]).toBe(PLAYER_SPEED);
    expect(Velocity.y[eid]).toBe(0);

    Input.direction[eid] = DIRECTION.left;
    movement(world, 16);

    expect(Velocity.x[eid]).toBe(-PLAYER_SPEED);
    expect(Velocity.y[eid]).toBe(0);
  });
});
