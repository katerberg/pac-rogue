import { query, removeEntity, type World } from "bitecs";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function harvestNearbyPellets(world: World, radiusTiles: number): number[] {
  const players = query(world, [Player, Position]);
  if (players.length === 0) {
    return [];
  }

  const playerEid = players[0]!;
  const playerCol = worldToCol(Position.x[playerEid] ?? 0);
  const playerRow = worldToRow(Position.y[playerEid] ?? 0);
  const radiusSq = radiusTiles * radiusTiles;

  const toRemove: number[] = [];
  for (const eid of query(world, [Pellet, Position])) {
    const dCol = worldToCol(Position.x[eid] ?? 0) - playerCol;
    const dRow = worldToRow(Position.y[eid] ?? 0) - playerRow;
    if (dCol * dCol + dRow * dRow <= radiusSq) {
      toRemove.push(eid);
    }
  }

  for (const eid of toRemove) {
    removeEntity(world, eid);
  }

  return toRemove;
}
