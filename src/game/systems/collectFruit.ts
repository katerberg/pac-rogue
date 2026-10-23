import { query, removeEntity, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import type { FruitKind } from "../../domain/fruit";
import { Drawable } from "../components/Drawable";
import { Fruit } from "../components/Fruit";
import { Player } from "../components/Player";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Position } from "../components/Position";

export function collectFruit(world: World, at?: { x: number; y: number }): number[] {
  const players = query(world, [Player, Position, Drawable]);
  if (players.length === 0) {
    return [];
  }

  const playerEid = players[0]!;
  const px = at?.x ?? Position.x[playerEid] ?? 0;
  const py = at?.y ?? Position.y[playerEid] ?? 0;
  const playerRadius = Drawable.radius[playerEid] ?? 0;

  const toRemove: number[] = [];
  for (const fruitEid of query(world, [Fruit, Position, Drawable])) {
    const fx = Position.x[fruitEid] ?? 0;
    const fy = Position.y[fruitEid] ?? 0;
    const fruitRadius = Drawable.radius[fruitEid] ?? 0;
    if (circlesOverlap(px, py, playerRadius, fx, fy, fruitRadius)) {
      toRemove.push(fruitEid);
    }
  }

  for (const eid of toRemove) {
    removeEntity(world, eid);
  }

  return toRemove;
}

export function removeAllFruit(
  world: World,
  keepEids: { has(eid: number): boolean } = new Set(),
): number[] {
  const removedEids = [...query(world, [Fruit])].filter((eid) => !keepEids.has(eid));
  for (const eid of removedEids) {
    removeEntity(world, eid);
  }
  return removedEids;
}

export function fruitPositions(world: World): { x: number; y: number }[] {
  return [...query(world, [Fruit, Position])].map((eid) => ({
    x: Position.x[eid] ?? 0,
    y: Position.y[eid] ?? 0,
  }));
}

export function fruitKindsOnBoard(world: World): FruitKind[] {
  return [...query(world, [Fruit])].map((eid) => Fruit.kind[eid] as FruitKind);
}

export function fruitTiles(world: World): { eid: number; col: number; row: number }[] {
  return [...query(world, [Fruit, Position])].map((eid) => ({
    eid,
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
  }));
}
