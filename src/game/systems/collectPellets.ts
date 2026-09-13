import { query, removeEntity, type World } from "bitecs";
import { Drawable } from "../components/Drawable";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function collectPellets(world: World): number {
  const players = query(world, [Player, Position, Drawable]);
  if (players.length === 0) {
    return 0;
  }

  const playerEid = players[0]!;
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const playerRadius = Drawable.radius[playerEid] ?? 0;

  const toRemove: number[] = [];
  for (const pelletEid of query(world, [Pellet, Position])) {
    const ox = (Position.x[pelletEid] ?? 0) - px;
    const oy = (Position.y[pelletEid] ?? 0) - py;
    const pelletRadius = Drawable.radius[pelletEid] ?? 0;
    const reach = playerRadius + pelletRadius;
    if (ox * ox + oy * oy <= reach * reach) {
      toRemove.push(pelletEid);
    }
  }

  for (const eid of toRemove) {
    removeEntity(world, eid);
  }

  return toRemove.length;
}
