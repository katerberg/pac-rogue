import { query, type World } from "bitecs";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { playerFarthestFromGhostsSpawn } from "../../domain/maze";
import { startWarpGlide, type WarpGlide } from "../../domain/warpGlide";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";

export function warpPlayerFarthestFromGhosts(world: World): WarpGlide | null {
  const eid = query(world, [Player, Position, Velocity])[0];
  if (eid === undefined) {
    return null;
  }
  const from = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
  const ghosts = Array.from(query(world, [Ghost, GhostPhase, Position]))
    .filter((ghost) => GhostPhase.value[ghost] === GHOST_PHASE.active)
    .map((ghost) => ({ x: Position.x[ghost] ?? 0, y: Position.y[ghost] ?? 0 }));
  const spawn = playerFarthestFromGhostsSpawn(ghosts);
  Position.x[eid] = spawn.x;
  Position.y[eid] = spawn.y;
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
  return startWarpGlide(from, spawn);
}
