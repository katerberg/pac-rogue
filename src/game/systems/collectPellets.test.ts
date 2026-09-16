import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import {
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PLAYER_RADIUS,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { collectPellets, countPellets } from "./collectPellets";

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

function spawnPellet(
  world: ReturnType<typeof createWorld>,
  x: number,
  y: number,
  drawableId: string = PELLET_DRAWABLE_ID,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.id[eid] = drawableId;
  Drawable.radius[eid] = PELLET_RADIUS;
  return eid;
}

describe("collectPellets", () => {
  it("removes an overlapping pellet and returns 1", () => {
    const { world } = spawnPlayer(100, 100);
    spawnPellet(world, 100, 100);

    expect(collectPellets(world)).toEqual({ removed: 1, powerRemoved: 0 });
    expect(query(world, [Pellet, Position])).toHaveLength(0);
  });

  it("leaves a distant pellet and returns 0", () => {
    const { world } = spawnPlayer(100, 100);
    const pelletEid = spawnPellet(world, 400, 400);

    expect(collectPellets(world)).toEqual({ removed: 0, powerRemoved: 0 });
    expect(query(world, [Pellet, Position])).toEqual([pelletEid]);
  });

  it("collects every pellet within reach in one frame", () => {
    const { world } = spawnPlayer(100, 100);
    spawnPellet(world, 100 + PLAYER_RADIUS, 100);
    spawnPellet(world, 100, 100 + PLAYER_RADIUS);
    spawnPellet(world, 500, 500);

    expect(collectPellets(world)).toEqual({ removed: 2, powerRemoved: 0 });
    expect(query(world, [Pellet, Position])).toHaveLength(1);
  });

  it("counts power pellets among removed", () => {
    const { world } = spawnPlayer(100, 100);
    spawnPellet(world, 100, 100, POWER_PELLET_DRAWABLE_ID);
    spawnPellet(world, 100 + PLAYER_RADIUS, 100);

    expect(collectPellets(world)).toEqual({ removed: 2, powerRemoved: 1 });
  });
});

describe("countPellets", () => {
  it("counts remaining pellet entities", () => {
    const { world } = spawnPlayer(100, 100);
    expect(countPellets(world)).toBe(0);
    spawnPellet(world, 100, 100);
    spawnPellet(world, 200, 200);
    expect(countPellets(world)).toBe(2);
    collectPellets(world);
    expect(countPellets(world)).toBe(1);
  });
});
