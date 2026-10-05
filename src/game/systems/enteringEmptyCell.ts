import { query, type World } from "bitecs";
import { worldToCol, worldToRow } from "../../domain/maze";
import { Fruit } from "../components/Fruit";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

export function enteringEmptyCell(world: World): boolean {
  const player = query(world, [Player, Position, Velocity])[0];
  if (player === undefined) {
    return false;
  }
  const col = worldToCol(Position.x[player] ?? 0) + Math.sign(Velocity.x[player] ?? 0);
  const row = worldToRow(Position.y[player] ?? 0) + Math.sign(Velocity.y[player] ?? 0);
  for (const eid of [...query(world, [Pellet, Position]), ...query(world, [Fruit, Position])]) {
    if (worldToCol(Position.x[eid] ?? 0) === col && worldToRow(Position.y[eid] ?? 0) === row) {
      return false;
    }
  }
  return true;
}
