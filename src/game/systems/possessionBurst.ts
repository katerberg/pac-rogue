import { query, type World } from "bitecs";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import type { PossessionBurst } from "../../domain/possessionBurst";

export function burstOutOfGhost(world: World, ghostEid: number): PossessionBurst {
  const x = Position.x[ghostEid] ?? 0;
  const y = Position.y[ghostEid] ?? 0;
  for (const eid of query(world, [Player, Position, Velocity, Input])) {
    Position.x[eid] = x;
    Position.y[eid] = y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
  }
  return { eid: ghostEid, x, y, elapsedMs: 0 };
}
