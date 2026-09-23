import { addComponent, addEntity, createWorld } from "bitecs";
import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { ghostRadius, playerRadius } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { slimeTrailKill } from "./slimeTrailKill";

function spawnPlayer(world: ReturnType<typeof createWorld>, col: number, row: number) {
  const eid = addEntity(world);
  addComponent(world, eid, Player);
  addComponent(world, eid, Position);
  addComponent(world, eid, Drawable);
  Position.x[eid] = cellCenterX(col);
  Position.y[eid] = cellCenterY(row);
  Drawable.radius[eid] = playerRadius();
  return eid;
}

describe("slimeTrailKill", () => {
  it("returns false for an empty trail", () => {
    const world = createWorld();
    spawnPlayer(world, 5, 5);
    expect(slimeTrailKill(world, [])).toBe(false);
  });

  it("returns true when the player overlaps a trail tile", () => {
    const world = createWorld();
    spawnPlayer(world, 5, 5);
    expect(slimeTrailKill(world, [{ col: 5, row: 5 }])).toBe(true);
  });

  it("returns false when the player is far from every trail tile", () => {
    const world = createWorld();
    spawnPlayer(world, 5, 5);
    expect(slimeTrailKill(world, [{ col: 20, row: 20 }])).toBe(false);
  });

  it("short-circuits when the player is invulnerable", () => {
    const world = createWorld();
    spawnPlayer(world, 5, 5);
    expect(slimeTrailKill(world, [{ col: 5, row: 5 }], { playerInvulnerable: true })).toBe(false);
  });

  it("uses ghost-radius reach around each trail tile", () => {
    const world = createWorld();
    const player = spawnPlayer(world, 5, 5);
    Position.x[player] = cellCenterX(5) + playerRadius() + ghostRadius() - 1;
    expect(slimeTrailKill(world, [{ col: 5, row: 5 }])).toBe(true);
  });
});
