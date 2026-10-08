import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import {
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { BossPellet } from "../components/BossPellet";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { applyRemoteTransference } from "./remoteTransference";

function spawnPlayer(world: ReturnType<typeof createWorld>, x: number, y: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
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
  Drawable.id[eid] = power ? POWER_PELLET_DRAWABLE_ID : PELLET_DRAWABLE_ID;
  Drawable.radius[eid] = PELLET_RADIUS;
  return eid;
}

function snapEids(snaps: { eid: number }[]): number[] {
  return snaps.map((snap) => snap.eid);
}

describe("applyRemoteTransference", () => {
  it("removes the farthest regular pellet and never an energizer", () => {
    const world = createWorld();
    const y = cellCenterY(1);
    spawnPlayer(world, cellCenterX(2), y);
    spawnPellet(world, cellCenterX(3), y);
    const far = spawnPellet(world, cellCenterX(8), y);
    const energizer = spawnPellet(world, cellCenterX(20), y, true);
    expect(snapEids(applyRemoteTransference(world, 1))).toEqual([far]);
    expect(query(world, [Pellet])).toContain(energizer);
    expect(query(world, [Pellet])).toHaveLength(2);
  });

  it("no-ops with count 0 or no regular pellets", () => {
    const world = createWorld();
    const y = cellCenterY(1);
    spawnPlayer(world, cellCenterX(2), y);
    spawnPellet(world, cellCenterX(5), y, true);
    expect(applyRemoteTransference(world, 0)).toEqual([]);
    expect(applyRemoteTransference(world, 1)).toEqual([]);
  });

  it("never takes a boss pellet", () => {
    const world = createWorld();
    const y = cellCenterY(1);
    spawnPlayer(world, cellCenterX(2), y);
    const boss = spawnPellet(world, cellCenterX(20), y);
    addComponent(world, boss, BossPellet);
    const regular = spawnPellet(world, cellCenterX(5), y);
    expect(snapEids(applyRemoteTransference(world, 1))).toEqual([regular]);
    expect(query(world, [Pellet])).toContain(boss);
  });
});
