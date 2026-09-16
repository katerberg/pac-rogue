import { query, removeEntity, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import { Drawable } from "../components/Drawable";
import { Fruit } from "../components/Fruit";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export type FruitCollectFrame = {
  removed: number;
};

export function collectFruit(world: World): FruitCollectFrame {
  const players = query(world, [Player, Position, Drawable]);
  if (players.length === 0) {
    return { removed: 0 };
  }

  const playerEid = players[0]!;
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
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

  return { removed: toRemove.length };
}

export function removeAllFruit(world: World): void {
  for (const eid of query(world, [Fruit])) {
    removeEntity(world, eid);
  }
}
