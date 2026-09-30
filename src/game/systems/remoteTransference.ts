import { hasComponent, query, removeEntity, type World } from "bitecs";
import { pickFurthestPelletEids } from "../../domain/pelletCollectExtra";
import { BossPellet } from "../components/BossPellet";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";

export function applyRemoteTransference(world: World, count: number): number[] {
  if (count <= 0) {
    return [];
  }
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return [];
  }

  const candidates: { eid: number; x: number; y: number }[] = [];
  for (const eid of query(world, [Pellet, Position])) {
    if (!hasComponent(world, eid, PowerPellet) && !hasComponent(world, eid, BossPellet)) {
      candidates.push({ eid, x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 });
    }
  }

  const chosen = pickFurthestPelletEids(
    candidates,
    Position.x[playerEid] ?? 0,
    Position.y[playerEid] ?? 0,
    count,
  );
  for (const eid of chosen) {
    removeEntity(world, eid);
  }
  return chosen;
}
