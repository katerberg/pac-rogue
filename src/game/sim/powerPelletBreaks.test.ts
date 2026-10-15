import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { startPowerPelletBreaks, type ActivePowerPelletBreak } from "./powerPelletBreaks";
import type { SimEvent } from "./simEvents";

describe("startPowerPelletBreaks", () => {
  it("biases from held Input when Facing is none", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Facing);
    addComponent(world, eid, Input);
    Facing.direction[eid] = DIRECTION.none;
    Input.direction[eid] = DIRECTION.right;

    const breaks: ActivePowerPelletBreak[] = [];
    const events: SimEvent[] = [];
    startPowerPelletBreaks(world, breaks, 1, [{ x: 10, y: 20 }], (event) => events.push(event));

    expect(events).toContainEqual({
      type: "powerPelletBreak",
      id: 1,
      x: 10,
      y: 20,
      facingDx: 1,
      facingDy: 0,
      progress: 0,
    });
    expect(breaks[0]?.facing).toEqual({ dx: 1, dy: 0 });
  });
});
