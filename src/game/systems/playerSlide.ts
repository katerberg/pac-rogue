import { query, type World } from "bitecs";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";

export function slidePlayer(world: World, dx: number, dy: number, deltaMs: number): number {
  let traveled = 0;
  for (const eid of query(world, [Player, Position, Speed])) {
    traveled = ((Speed.px[eid] ?? 0) * deltaMs) / 1000;
    Position.x[eid] = (Position.x[eid] ?? 0) + dx * traveled;
    Position.y[eid] = (Position.y[eid] ?? 0) + dy * traveled;
  }
  return traveled;
}
