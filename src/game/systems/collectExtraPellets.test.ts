import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { PELLET_RADIUS } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { collectExtraPellets } from "./collectExtraPellets";

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

describe("collectExtraPellets", () => {
  it("no-ops when count is zero", () => {
    const world = createWorld();
    spawnPellet(world, 0, 0);
    expect(collectExtraPellets(world, 0, () => 0)).toEqual({ removedEids: [] });
    expect(query(world, [Pellet])).toHaveLength(1);
  });

  it("removes only regular pellets and leaves energizers", () => {
    const world = createWorld();
    const a = spawnPellet(world, 0, 0);
    const b = spawnPellet(world, 10, 0);
    const power = spawnPellet(world, 20, 0, true);
    spawnPellet(world, 30, 0);

    const { removedEids } = collectExtraPellets(world, 2, () => 0);
    expect(removedEids).toEqual([a, b]);
    expect(query(world, [Pellet])).toHaveLength(2);
    expect(query(world, [PowerPellet])).toEqual([power]);
  });

  it("returns empty when only energizers remain", () => {
    const world = createWorld();
    const power = spawnPellet(world, 0, 0, true);
    expect(collectExtraPellets(world, 3, () => 0)).toEqual({ removedEids: [] });
    expect(query(world, [Pellet])).toEqual([power]);
  });

  it("collects all remaining regulars when fewer than count", () => {
    const world = createWorld();
    const only = spawnPellet(world, 0, 0);
    expect(collectExtraPellets(world, 3, () => 0)).toEqual({ removedEids: [only] });
    expect(query(world, [Pellet])).toHaveLength(0);
  });
});
