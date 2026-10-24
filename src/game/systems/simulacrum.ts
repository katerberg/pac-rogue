import { query, removeEntity, type World } from "bitecs";
import type { GhostDir } from "../../domain/ghostPath";
import { worldToCol, worldToRow, type SolidGrid } from "../../domain/maze";
import { nearestIndex, type BodyTile } from "../../domain/mirror";
import { Facing } from "../components/Facing";
import { Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Simulacrum } from "../components/Simulacrum";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";

type Point = { x: number; y: number };

export function simulacrumEids(world: World): number[] {
  return [...query(world, [Simulacrum, Position])];
}

function pointOf(eid: number): Point {
  return { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
}

export function simulacrumPoints(world: World): Point[] {
  return simulacrumEids(world).map(pointOf);
}

export function simulacrumBodies(world: World): BodyTile[] {
  return simulacrumEids(world).map((eid) => ({
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
    facing: (Facing.direction[eid] ?? 0) as GhostDir,
  }));
}

export function simulacrumSprites(world: World): { x: number; y: number; facing: number }[] {
  return simulacrumEids(world).map((eid) => ({ ...pointOf(eid), facing: Facing.direction[eid] ?? 0 }));
}

export function syncSimulacra(world: World): void {
  const player = query(world, [Player, Input, Speed])[0];
  if (player === undefined) {
    return;
  }
  for (const eid of query(world, [Simulacrum, Input, Speed])) {
    Input.direction[eid] = Input.direction[player] ?? 0;
    Speed.px[eid] = Speed.px[player] ?? 0;
  }
}

export function removeSimulacrum(world: World, eid: number): Point {
  const at = pointOf(eid);
  removeEntity(world, eid);
  return at;
}

export function promoteNearestSimulacrum(world: World, solids: SolidGrid): Point | null {
  const player = query(world, [Player, Position, Velocity, Facing])[0];
  const copies = simulacrumEids(world);
  if (player === undefined || copies.length === 0) {
    return null;
  }
  const from = pointOf(player);
  const tiles = copies.map((eid) => ({
    col: worldToCol(Position.x[eid] ?? 0),
    row: worldToRow(Position.y[eid] ?? 0),
  }));
  const copy = copies[
    nearestIndex({ col: worldToCol(from.x), row: worldToRow(from.y) }, tiles, solids)
  ]!;
  Position.x[player] = Position.x[copy] ?? 0;
  Position.y[player] = Position.y[copy] ?? 0;
  Velocity.x[player] = Velocity.x[copy] ?? 0;
  Velocity.y[player] = Velocity.y[copy] ?? 0;
  Facing.direction[player] = Facing.direction[copy] ?? 0;
  removeEntity(world, copy);
  return from;
}
