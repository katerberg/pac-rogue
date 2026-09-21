import { hasComponent, query, removeEntity, type World } from "bitecs";
import { pickClosestOffForwardPelletEids, type FacingStep } from "../../domain/pelletCollectExtra";
import type { SolidGrid } from "../../domain/maze";
import { Pellet } from "../components/Pellet";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";

export function collectExtraPellets(
  world: World,
  count: number,
  playerX: number,
  playerY: number,
  facingStep: FacingStep,
  solids: SolidGrid,
): number[] {
  if (count <= 0) {
    return [];
  }

  const candidates: { eid: number; x: number; y: number }[] = [];
  for (const eid of query(world, [Pellet, Position])) {
    if (!hasComponent(world, eid, PowerPellet)) {
      candidates.push({
        eid,
        x: Position.x[eid] ?? 0,
        y: Position.y[eid] ?? 0,
      });
    }
  }

  const chosen = pickClosestOffForwardPelletEids(
    candidates,
    playerX,
    playerY,
    facingStep,
    solids,
    count,
  );
  for (const eid of chosen) {
    removeEntity(world, eid);
  }
  return chosen;
}
