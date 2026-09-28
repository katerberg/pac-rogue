import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { slidePlayer } from "./playerSlide";

describe("slidePlayer", () => {
  it("moves the player along the direction at its speed with no wrap", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Position);
    addComponent(world, eid, Speed);
    Position.x[eid] = 5;
    Position.y[eid] = 50;
    Speed.px[eid] = 100;

    const traveled = slidePlayer(world, -1, 0, 500);

    expect(traveled).toBe(50);
    expect(Position.x[eid]).toBe(-45);
    expect(Position.y[eid]).toBe(50);
  });
});
