import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { PELLET_RADIUS } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { collectExtraPellets } from "./collectExtraPellets";

function spawnPlayer(world: ReturnType<typeof createWorld>, x: number, y: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
  return eid;
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

describe("collectExtraPellets", () => {
  it("no-ops when count is zero", () => {
    const world = createWorld();
    spawnPlayer(world, cellCenterX(2), cellCenterY(1));
    spawnPellet(world, cellCenterX(0), cellCenterY(1));
    expect(collectExtraPellets(world, 0)).toEqual([]);
    expect(query(world, [Pellet])).toHaveLength(1);
  });

  it("removes the farthest regular pellets and leaves energizers", () => {
    const world = createWorld();
    const py = cellCenterY(1);
    spawnPlayer(world, cellCenterX(2), py);
    const near = spawnPellet(world, cellCenterX(1), py);
    const mid = spawnPellet(world, cellCenterX(3), py);
    const far = spawnPellet(world, cellCenterX(0), py);
    const farthest = spawnPellet(world, cellCenterX(6), py);
    const power = spawnPellet(world, cellCenterX(9), py, true);

    expect(collectExtraPellets(world, 2)).toEqual([farthest, far]);
    expect([...query(world, [Pellet])].sort()).toEqual([near, mid, power].sort());
    expect(query(world, [PowerPellet])).toEqual([power]);
  });

  it("returns empty when only energizers remain", () => {
    const world = createWorld();
    spawnPlayer(world, cellCenterX(2), cellCenterY(1));
    const power = spawnPellet(world, cellCenterX(0), cellCenterY(1), true);
    expect(collectExtraPellets(world, 3)).toEqual([]);
    expect(query(world, [Pellet])).toEqual([power]);
  });

  it("collects all remaining regulars when fewer than count", () => {
    const world = createWorld();
    spawnPlayer(world, cellCenterX(2), cellCenterY(1));
    const only = spawnPellet(world, cellCenterX(0), cellCenterY(1));
    expect(collectExtraPellets(world, 3)).toEqual([only]);
    expect(query(world, [Pellet])).toHaveLength(0);
  });
});
