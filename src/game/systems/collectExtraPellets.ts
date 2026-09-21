import { hasComponent, query, removeEntity, type World } from "bitecs";
import { pickClosestOffForwardPelletEids } from "../../domain/pelletCollectExtra";
import type { SolidGrid } from "../../domain/maze";
import { Facing } from "../components/Facing";
import { DIRECTION, type Direction } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";

function facingStep(facing: Direction): { col: number; row: number } {
  switch (facing) {
    case DIRECTION.up:
      return { col: 0, row: -1 };
    case DIRECTION.down:
      return { col: 0, row: 1 };
    case DIRECTION.left:
      return { col: -1, row: 0 };
    case DIRECTION.right:
      return { col: 1, row: 0 };
    default:
      return { col: 0, row: 0 };
  }
}

export function collectExtraPellets(world: World, count: number, solids: SolidGrid): number[] {
  if (count <= 0) {
    return [];
  }

  const players = query(world, [Player, Position, Facing]);
  const playerEid = players[0];
  if (playerEid === undefined) {
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
    Position.x[playerEid] ?? 0,
    Position.y[playerEid] ?? 0,
    facingStep(Facing.direction[playerEid] ?? DIRECTION.none),
    solids,
    count,
  );
  for (const eid of chosen) {
    removeEntity(world, eid);
  }
  return chosen;
}
