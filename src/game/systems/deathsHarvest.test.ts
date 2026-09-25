import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { harvestNearbyPellets } from "./deathsHarvest";

function spawnPlayer(col: number, row: number) {
  const world = createWorld();
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return { world, eid };
}

function spawnPellet(
  world: ReturnType<typeof createWorld>,
  col: number,
  row: number,
  power = false,
) {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  if (power) {
    addComponent(world, eid, PowerPellet);
  }
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  return eid;
}

describe("harvestNearbyPellets", () => {
  it("removes regular and power pellets within the tile radius", () => {
    const { world } = spawnPlayer(10, 10);
    const near = spawnPellet(world, 12, 10);
    const nearPower = spawnPellet(world, 10, 15, true);

    const removed = harvestNearbyPellets(world, 10);

    expect(removed.sort()).toEqual([near, nearPower].sort());
    expect(query(world, [Pellet])).toHaveLength(0);
  });

  it("leaves pellets outside the radius", () => {
    const { world } = spawnPlayer(0, 0);
    const far = spawnPellet(world, 25, 25);

    expect(harvestNearbyPellets(world, 10)).toEqual([]);
    expect(query(world, [Pellet])).toEqual([far]);
  });

  it("returns empty without a player", () => {
    const world = createWorld();
    spawnPellet(world, 0, 0);
    expect(harvestNearbyPellets(world, 10)).toEqual([]);
  });
});
