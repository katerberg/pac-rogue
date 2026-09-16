import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { PELLET_RADIUS, PLAYER_RADIUS } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
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

function spawnPellet(world: ReturnType<typeof createWorld>, x: number, y: number, power = false) {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  if (power) {
    addComponent(world, eid, PowerPellet);
  }
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = PELLET_RADIUS;
  return eid;
}

describe("collectPellets", () => {
  it("removes an overlapping pellet", () => {
    const { world } = spawnPlayer(100, 100);
    spawnPellet(world, 100, 100);

    expect(collectPellets(world)).toEqual({ removed: 1, powerRemoved: 0 });
    expect(query(world, [Pellet, Position])).toHaveLength(0);
  });

  it("leaves a distant pellet", () => {
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
    spawnPellet(world, 100, 100, true);
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
