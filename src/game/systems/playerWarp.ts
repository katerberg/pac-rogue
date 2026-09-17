import { query, type World } from "bitecs";
import { playerTopCenterSpawn } from "../../domain/maze";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

export function warpPlayerToTopCenter(world: World): void {
  const players = query(world, [Player, Position, Velocity]);
  const eid = players[0];
  if (eid === undefined) {
    return;
  }
  const spawn = playerTopCenterSpawn();
  Position.x[eid] = spawn.x;
  Position.y[eid] = spawn.y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
}
