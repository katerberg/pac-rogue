import { hasComponent, query, removeEntity, type World } from "bitecs";
import { hasPelletLineOfSight } from "../../domain/pelletLos";
import type { SolidGrid } from "../../domain/maze";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";

export type PelletCollectFrame = {
  powerRemoved: number;
  removedEids: number[];
  removedPowerPositions: { x: number; y: number }[];
};

export type CollectPelletsOptions = {
  radiusBonusPx?: number;
  solids?: SolidGrid;
};

export function countPellets(world: World): number {
  return query(world, [Pellet]).length;
}

export function collectPellets(world: World, opts: CollectPelletsOptions = {}): PelletCollectFrame {
  const players = query(world, [Player, Position, Drawable]);
  if (players.length === 0) {
    return { powerRemoved: 0, removedEids: [], removedPowerPositions: [] };
  }

  const radiusBonusPx = opts.radiusBonusPx ?? 0;
  const solids = opts.solids;

  const playerEid = players[0]!;
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const playerRadius = Drawable.radius[playerEid] ?? 0;

  const toRemove: number[] = [];
  for (const pelletEid of query(world, [Pellet, Position])) {
    const ox = (Position.x[pelletEid] ?? 0) - px;
    const oy = (Position.y[pelletEid] ?? 0) - py;
    const pelletRadius = Drawable.radius[pelletEid] ?? 0;
    const baseReach = playerRadius + pelletRadius;
    const distSq = ox * ox + oy * oy;
    if (distSq <= baseReach * baseReach) {
      toRemove.push(pelletEid);
      continue;
    }
    if (radiusBonusPx > 0 && solids !== undefined && !hasComponent(world, pelletEid, PowerPellet)) {
      const extendedReach = baseReach + radiusBonusPx;
      if (
        distSq <= extendedReach * extendedReach &&
        hasPelletLineOfSight(px, py, Position.x[pelletEid] ?? 0, Position.y[pelletEid] ?? 0, solids)
      ) {
        toRemove.push(pelletEid);
      }
    }
  }

  let powerRemoved = 0;
  const removedPowerPositions: { x: number; y: number }[] = [];
  for (const eid of toRemove) {
    if (hasComponent(world, eid, PowerPellet)) {
      powerRemoved += 1;
      removedPowerPositions.push({ x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 });
    }
    removeEntity(world, eid);
  }

  return { powerRemoved, removedEids: toRemove, removedPowerPositions };
}
