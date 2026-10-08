import { hasComponent, query, removeEntity, type World } from "bitecs";
import { pickFurthestPelletEids } from "../../domain/pelletCollectExtra";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { pelletSnap, type RemovedPelletSnap } from "./collectPellets";

export function collectExtraPellets(world: World, count: number): RemovedPelletSnap[] {
  if (count <= 0) {
    return [];
  }

  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return [];
  }

  const candidates: { eid: number; x: number; y: number }[] = [];
  for (const eid of query(world, [Pellet, Position])) {
    if (!hasComponent(world, eid, PowerPellet)) {
      candidates.push({ eid, x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 });
    }
  }

  const chosen = pickFurthestPelletEids(
    candidates,
    Position.x[playerEid] ?? 0,
    Position.y[playerEid] ?? 0,
    count,
  );
  const snaps: RemovedPelletSnap[] = [];
  for (const eid of chosen) {
    snaps.push(pelletSnap(world, eid));
    removeEntity(world, eid);
  }
  return snaps;
}
