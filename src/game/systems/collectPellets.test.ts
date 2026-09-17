import { addComponent, addEntity, createWorld, query, removeEntity } from "bitecs";
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
    const pelletEid = spawnPellet(world, 100, 100);

    expect(collectPellets(world)).toEqual({ powerRemoved: 0, removedEids: [pelletEid] });
    expect(query(world, [Pellet, Position])).toHaveLength(0);
  });

  it("leaves a distant pellet", () => {
    const { world } = spawnPlayer(100, 100);
    const pelletEid = spawnPellet(world, 400, 400);

    expect(collectPellets(world)).toEqual({ powerRemoved: 0, removedEids: [] });
    expect(query(world, [Pellet, Position])).toEqual([pelletEid]);
  });

  it("collects every pellet within reach in one frame", () => {
    const { world } = spawnPlayer(100, 100);
    const a = spawnPellet(world, 100 + PLAYER_RADIUS, 100);
    const b = spawnPellet(world, 100, 100 + PLAYER_RADIUS);
    spawnPellet(world, 500, 500);

    expect(collectPellets(world)).toEqual({ powerRemoved: 0, removedEids: [a, b] });
    expect(query(world, [Pellet, Position])).toHaveLength(1);
  });

  it("counts power pellets among removed", () => {
    const { world } = spawnPlayer(100, 100);
    const power = spawnPellet(world, 100, 100, true);
    const regular = spawnPellet(world, 100 + PLAYER_RADIUS, 100);

    expect(collectPellets(world)).toEqual({
      powerRemoved: 1,
      removedEids: [power, regular],
    });
  });

  it("returns removed eids so visuals can be released before bitecs reuses them", () => {
    const { world } = spawnPlayer(0, 0);
    const pellet = spawnPellet(world, 0, 0);
    const released = new Set<number>();

    const collected = collectPellets(world);
    expect(collected.removedEids).toEqual([pellet]);
    for (const eid of collected.removedEids) {
      released.add(eid);
    }

    const next = addEntity(world);
    expect(next).toBe(pellet);
    expect(released.has(next)).toBe(true);
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

describe("bitecs eid reuse", () => {
  it("reuses an eid after removeEntity in the same frame", () => {
    const world = createWorld();
    const removed = addEntity(world);
    removeEntity(world, removed);
    expect(addEntity(world)).toBe(removed);
  });
});
