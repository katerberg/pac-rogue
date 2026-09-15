import { query, type World } from "bitecs";
import { DIRECTION, Input } from "../components/Input";
import { Player } from "../components/Player";

export function hasPlayerDirectionInput(world: World): boolean {
  const players = query(world, [Player, Input]);
  if (players.length === 0) {
    return false;
  }
  const eid = players[0]!;
  return (Input.direction[eid] ?? DIRECTION.none) !== DIRECTION.none;
}
