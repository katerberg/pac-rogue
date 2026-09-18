import { hasComponent, query, removeEntity, type World } from "bitecs";
import { pickUniformPelletEids } from "../../domain/pelletCollectExtra";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";

export function collectExtraPellets(world: World, count: number, rng: () => number): number[] {
  if (count <= 0) {
    return [];
  }

  const candidates: number[] = [];
  for (const eid of query(world, [Pellet, Position])) {
    if (!hasComponent(world, eid, PowerPellet)) {
      candidates.push(eid);
    }
  }

  const chosen = pickUniformPelletEids(candidates, count, rng);
  for (const eid of chosen) {
    removeEntity(world, eid);
  }
  return chosen;
}
