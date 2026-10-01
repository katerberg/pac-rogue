import { query, type World } from "bitecs";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction, Input } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function hasPlayerDirectionInput(world: World): boolean {
  const players = query(world, [Player, Input]);
  if (players.length === 0) {
    return false;
  }
  const eid = players[0]!;
  return (Input.direction[eid] ?? DIRECTION.none) !== DIRECTION.none;
}

export function playerFacing(world: World): Direction {
  const eid = query(world, [Player, Facing])[0];
  return eid === undefined ? DIRECTION.none : (Facing.direction[eid] ?? DIRECTION.none);
}

export function playerPose(world: World): { x: number; y: number; facing: Direction } | null {
  const eid = query(world, [Player, Position, Facing])[0];
  if (eid === undefined) {
    return null;
  }
  return {
    x: Position.x[eid] ?? 0,
    y: Position.y[eid] ?? 0,
    facing: (Facing.direction[eid] ?? DIRECTION.none) as Direction,
  };
}

export function clearPlayerDirectionInput(world: World): void {
  for (const eid of query(world, [Player, Input])) {
    Input.direction[eid] = DIRECTION.none;
  }
}
