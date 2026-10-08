import { hasComponent, query, removeEntity, type World } from "bitecs";
import { BossGhost } from "../components/BossGhost";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import type { PelletCollectFrame } from "./collectPellets";

export function harvestPelletsByGhosts(world: World): PelletCollectFrame {
  const ghosts = query(world, [Ghost, Position, Drawable]).filter(
    (eid) => !hasComponent(world, eid, BossGhost),
  );
  const toRemove: number[] = [];
  if (ghosts.length > 0) {
    for (const pelletEid of query(world, [Pellet, Position])) {
      if (hasComponent(world, pelletEid, PowerPellet)) {
        continue;
      }
      const pelletRadius = Drawable.radius[pelletEid] ?? 0;
      const touched = ghosts.some((ghostEid) => {
        const ox = (Position.x[pelletEid] ?? 0) - (Position.x[ghostEid] ?? 0);
        const oy = (Position.y[pelletEid] ?? 0) - (Position.y[ghostEid] ?? 0);
        const reach = (Drawable.radius[ghostEid] ?? 0) + pelletRadius;
        return ox * ox + oy * oy <= reach * reach;
      });
      if (touched) {
        toRemove.push(pelletEid);
      }
    }
  }

  for (const eid of toRemove) {
    removeEntity(world, eid);
  }
  return { powerRemoved: 0, removedEids: toRemove, removedPowerPositions: [], removedSnaps: [] };
}
