import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { PLAYER_SPEED } from "../../domain/playfield";
import { Player } from "../components/Player";
import { Speed } from "../components/Speed";
import { applyPlayerSpeed } from "./playerSpeed";

describe("applyPlayerSpeed", () => {
  it("writes PLAYER_SPEED * mul on the player", () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, eid, Player);
    addComponent(world, eid, Speed);
    Speed.px[eid] = 0;

    applyPlayerSpeed(world, 1.25);
    expect(Speed.px[eid]).toBeCloseTo(PLAYER_SPEED * 1.25);
  });
});
