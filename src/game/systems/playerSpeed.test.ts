import { addComponent, addEntity, createWorld } from "bitecs";
import { afterEach, describe, expect, it } from "vitest";
import { activateLayout } from "../../domain/maze";
import { PLAYER_SPEED, speedTileScale } from "../../domain/playfield";
import { Player } from "../components/Player";
import { Speed } from "../components/Speed";
import { applyPlayerSpeed } from "./playerSpeed";

describe("applyPlayerSpeed", () => {
  afterEach(() => {
    activateLayout("maze1");
  });

  it("writes PLAYER_SPEED * mul on the player", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Speed);
    Speed.px[eid] = 0;

    applyPlayerSpeed(world, 1.25);
    expect(Speed.px[eid]).toBeCloseTo(PLAYER_SPEED * 1.25);
  });

  it("scales speed with the active layout's tile size so tiles-per-second stays constant", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Speed);
    Speed.px[eid] = 0;

    activateLayout("mazeSmall");
    applyPlayerSpeed(world, 1);
    expect(speedTileScale()).toBeGreaterThan(1);
    expect(Speed.px[eid]).toBeCloseTo(PLAYER_SPEED * speedTileScale());
  });
});
