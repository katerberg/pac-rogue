import { query, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function catchPlayer(world: World): boolean {
  const players = query(world, [Player, Position, Drawable]);
  const playerEid = players[0];
  if (playerEid === undefined) {
    return false;
  }

  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const pr = Drawable.radius[playerEid] ?? 0;

  for (const eid of query(world, [Ghost, GhostPhase, Position, Drawable])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }
    const gx = Position.x[eid] ?? 0;
    const gy = Position.y[eid] ?? 0;
    const gr = Drawable.radius[eid] ?? 0;
    if (circlesOverlap(px, py, pr, gx, gy, gr)) {
      return true;
    }
  }

  return false;
}
