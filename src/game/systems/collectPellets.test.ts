import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { PELLET_RADIUS, PLAYER_RADIUS } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { collectPellets } from "./collectPellets";

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

function spawnPellet(world: ReturnType<typeof createWorld>, x: number, y: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Pellet);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Drawable.radius[eid] = PELLET_RADIUS;
  return eid;
}

describe("collectPellets", () => {
  it("removes an overlapping pellet and returns 1", () => {
    const { world } = spawnPlayer(100, 100);
    spawnPellet(world, 100, 100);

    expect(collectPellets(world)).toBe(1);
    expect(query(world, [Pellet, Position])).toHaveLength(0);
  });

  it("leaves a distant pellet and returns 0", () => {
    const { world } = spawnPlayer(100, 100);
    const pelletEid = spawnPellet(world, 400, 400);

    expect(collectPellets(world)).toBe(0);
    expect(query(world, [Pellet, Position])).toEqual([pelletEid]);
  });

  it("collects every pellet within reach in one frame", () => {
    const { world } = spawnPlayer(100, 100);
    spawnPellet(world, 100 + PLAYER_RADIUS, 100);
    spawnPellet(world, 100, 100 + PLAYER_RADIUS);
    spawnPellet(world, 500, 500);

    expect(collectPellets(world)).toBe(2);
    expect(query(world, [Pellet, Position])).toHaveLength(1);
  });
});
