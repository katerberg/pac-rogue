import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { TILE_SIZE } from "../../domain/maze";
import { FRUIT_RADIUS, playerRadius } from "../../domain/playfield";
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
  Drawable.radius[eid] = playerRadius();
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
    const fruitEid = spawnFruit(world, 100, 100);

    expect(collectFruit(world)).toEqual([fruitEid]);
    expect(query(world, [Fruit, Position])).toHaveLength(0);
  });

  it("leaves a distant fruit", () => {
    const { world } = spawnPlayer(100, 100);
    const fruitEid = spawnFruit(world, 400, 400);

    expect(collectFruit(world)).toEqual([]);
    expect(query(world, [Fruit, Position])).toEqual([fruitEid]);
  });

  it("does not collect from an adjacent cell center", () => {
    const fruitX = 200;
    const fruitY = 200;
    const { world } = spawnPlayer(fruitX - TILE_SIZE, fruitY);
    spawnFruit(world, fruitX, fruitY);

    expect(playerRadius() + FRUIT_RADIUS).toBeLessThan(TILE_SIZE);
    expect(collectFruit(world)).toEqual([]);
    expect(query(world, [Fruit, Position])).toHaveLength(1);
  });

  it("returns zero when there is no player", () => {
    const world = createWorld();
    spawnFruit(world, 100, 100);
    expect(collectFruit(world)).toEqual([]);
    expect(query(world, [Fruit])).toHaveLength(1);
  });
});

describe("removeAllFruit", () => {
  it("removes every fruit entity and returns their eids", () => {
    const { world } = spawnPlayer(0, 0);
    const a = spawnFruit(world, 1, 1);
    const b = spawnFruit(world, 2, 2);
    expect(removeAllFruit(world).sort()).toEqual([a, b].sort());
    expect(query(world, [Fruit])).toHaveLength(0);
  });
});
