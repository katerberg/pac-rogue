import { hasComponent, query, removeEntity, type World } from "bitecs";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import type { PelletCollectFrame } from "./collectPellets";

/** Ghost-harvester style: regular pellets only, no power pellets. */
export function harvestPelletsByGhost(world: World, ghostEid: number): PelletCollectFrame {
  const gx = Position.x[ghostEid] ?? 0;
  const gy = Position.y[ghostEid] ?? 0;
  const gr = Drawable.radius[ghostEid] ?? 0;
  const toRemove: number[] = [];
  for (const pelletEid of query(world, [Pellet, Position])) {
    if (hasComponent(world, pelletEid, PowerPellet)) {
      continue;
    }
    const pelletRadius = Drawable.radius[pelletEid] ?? 0;
    const ox = (Position.x[pelletEid] ?? 0) - gx;
    const oy = (Position.y[pelletEid] ?? 0) - gy;
    const reach = gr + pelletRadius;
    if (ox * ox + oy * oy <= reach * reach) {
      toRemove.push(pelletEid);
    }
  }
  for (const eid of toRemove) {
    removeEntity(world, eid);
  }
  return { powerRemoved: 0, removedEids: toRemove, removedPowerPositions: [] };
}
