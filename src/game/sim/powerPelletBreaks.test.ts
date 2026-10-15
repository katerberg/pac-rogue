import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  POWER_PELLET_BREAK_INTENSITY_HARD,
  POWER_PELLET_BREAK_INTENSITY_SOFT,
} from "../../domain/powerPelletBreak";
import { PLAYER_SPEED } from "../../domain/playfield";
import { speedLevelMultiplier } from "../../domain/tuning";
import { Facing } from "../components/Facing";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Speed } from "../components/Speed";
import { startPowerPelletBreaks, type ActivePowerPelletBreak } from "./powerPelletBreaks";
import type { SimEvent } from "./simEvents";

describe("startPowerPelletBreaks", () => {
  it("biases from held Input when Facing is none", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Facing);
    addComponent(world, eid, Input);
    addComponent(world, eid, Speed);
    Facing.direction[eid] = DIRECTION.none;
    Input.direction[eid] = DIRECTION.right;
    Speed.px[eid] = PLAYER_SPEED;

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
      intensity: POWER_PELLET_BREAK_INTENSITY_SOFT,
      progress: 0,
    });
    expect(breaks[0]?.facing).toEqual({ dx: 1, dy: 0 });
  });

  it("records harder intensity at level-7 baseline speed", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Facing);
    addComponent(world, eid, Input);
    addComponent(world, eid, Speed);
    Facing.direction[eid] = DIRECTION.right;
    Input.direction[eid] = DIRECTION.right;
    Speed.px[eid] = PLAYER_SPEED * speedLevelMultiplier(7);

    const breaks: ActivePowerPelletBreak[] = [];
    startPowerPelletBreaks(world, breaks, 1, [{ x: 0, y: 0 }], () => undefined);
    expect(breaks[0]?.intensity).toBeCloseTo(POWER_PELLET_BREAK_INTENSITY_HARD);
  });
});
