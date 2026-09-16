import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { FRUIT_RADIUS, PLAYER_RADIUS } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Fruit } from "../components/Fruit";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { collectFruit, removeAllFruit } from "./collectFruit";

function spawnPlayer(x: number, y: number) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = PLAYER_RADIUS;
  return { world, eid };
}

function spawnFruit(world: ReturnType<typeof createWorld>, x: number, y: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Fruit);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = FRUIT_RADIUS;
  return eid;
}

describe("collectFruit", () => {
  it("removes an overlapping fruit", () => {
    const { world } = spawnPlayer(100, 100);
    spawnFruit(world, 100, 100);

    expect(collectFruit(world)).toEqual({ removed: 1 });
    expect(query(world, [Fruit, Position])).toHaveLength(0);
  });

  it("leaves a distant fruit", () => {
    const { world } = spawnPlayer(100, 100);
    const fruitEid = spawnFruit(world, 400, 400);

    expect(collectFruit(world)).toEqual({ removed: 0 });
    expect(query(world, [Fruit, Position])).toEqual([fruitEid]);
  });

  it("returns zero when there is no player", () => {
    const world = createWorld();
    spawnFruit(world, 100, 100);
    expect(collectFruit(world)).toEqual({ removed: 0 });
    expect(query(world, [Fruit])).toHaveLength(1);
  });
});

describe("removeAllFruit", () => {
  it("removes every fruit entity", () => {
    const { world } = spawnPlayer(0, 0);
    spawnFruit(world, 1, 1);
    spawnFruit(world, 2, 2);
    removeAllFruit(world);
    expect(query(world, [Fruit])).toHaveLength(0);
  });
});
