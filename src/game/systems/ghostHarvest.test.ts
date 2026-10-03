import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { BossGhost } from "../components/BossGhost";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { harvestPelletsByGhosts } from "./ghostHarvest";

type World = ReturnType<typeof createWorld>;

function spawnGhost(world: World, x: number, y: number, boss = false) {
  const eid = addEntity(world);
  addComponent(world, eid, Ghost);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  if (boss) {
    addComponent(world, eid, BossGhost);
  }
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = 10;
  return eid;
}

function spawnPellet(world: World, x: number, y: number, power = false) {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  if (power) {
    addComponent(world, eid, PowerPellet);
  }
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = 3;
  return eid;
}

describe("harvestPelletsByGhosts", () => {
  it("removes pellets a ghost touches and leaves distant ones", () => {
    const world = createWorld();
    spawnGhost(world, 100, 100);
    const near = spawnPellet(world, 105, 100);
    const far = spawnPellet(world, 200, 100);
    const frame = harvestPelletsByGhosts(world);
    expect(frame.removedEids).toEqual([near]);
    expect(query(world, [Pellet])).toEqual([far]);
    expect(frame.powerRemoved).toBe(0);
  });

  it("leaves power pellets for the player", () => {
    const world = createWorld();
    spawnGhost(world, 100, 100);
    const power = spawnPellet(world, 100, 104, true);
    const frame = harvestPelletsByGhosts(world);
    expect(frame.removedEids).toEqual([]);
    expect(frame.powerRemoved).toBe(0);
    expect(query(world, [PowerPellet])).toEqual([power]);
  });

  it("does not double-count a pellet two ghosts touch", () => {
    const world = createWorld();
    spawnGhost(world, 100, 100);
    spawnGhost(world, 102, 100);
    spawnPellet(world, 101, 100);
    expect(harvestPelletsByGhosts(world).removedEids).toHaveLength(1);
  });

  it("ignores boss ghosts", () => {
    const world = createWorld();
    spawnGhost(world, 100, 100, true);
    spawnPellet(world, 100, 100);
    expect(harvestPelletsByGhosts(world).removedEids).toHaveLength(0);
  });
});
