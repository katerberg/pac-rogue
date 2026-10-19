import { addComponent, addEntity, createWorld, query } from "bitecs";
import { describe, expect, it } from "vitest";
import { PELLET_RADIUS, playerRadius } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Fruit } from "../components/Fruit";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import {
  collectExtraForBodies,
  collectFruitForBodies,
  collectPelletsForBodies,
} from "./collectBodies";

function build() {
  const world = createWorld();
  const player = addEntity(world);
  addComponent(world, player, Player);
  addComponent(world, player, Position);
  addComponent(world, player, Drawable);
  Position.x[player] = 100;
  Position.y[player] = 100;
  Drawable.radius[player] = playerRadius();
  const at = (x: number, y: number, kind: object) => {
    const eid = addEntity(world);
    addComponent(world, eid, kind);
    addComponent(world, eid, Position);
    addComponent(world, eid, Drawable);
    Position.x[eid] = x;
    Position.y[eid] = y;
    Drawable.radius[eid] = PELLET_RADIUS;
    return eid;
  };
  return { world, at };
}

describe("collecting for both bodies", () => {
  it("eats pellets under the player and under the twin, or only the player's with no twin", () => {
    const { world, at } = build();
    const mine = at(100, 100, Pellet);
    const theirs = at(500, 100, Pellet);
    expect(collectPelletsForBodies(world, {}, null).removedEids).toEqual([mine]);
    expect(collectPelletsForBodies(world, {}, { x: 500, y: 100 }).removedEids).toEqual([theirs]);
  });

  it("eats fruit under either body", () => {
    const { world, at } = build();
    const mine = at(100, 100, Fruit);
    const theirs = at(500, 100, Fruit);
    expect(collectFruitForBodies(world, { x: 500, y: 100 })).toEqual([mine, theirs]);
  });

  it("takes the farthest pellets from each body", () => {
    const { world, at } = build();
    const left = at(0, 100, Pellet);
    const right = at(1000, 100, Pellet);
    const eaten = collectExtraForBodies(world, 1, { x: 1000, y: 100 });
    expect(new Set(eaten)).toEqual(new Set([left, right]));
    expect(query(world, [Pellet])).toHaveLength(0);
  });
});
