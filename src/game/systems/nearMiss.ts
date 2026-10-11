import { query, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { stepNearMissPasses, type NearMissPasses } from "../../domain/nearMiss";
import type { CatchOptions } from "./catchPlayer";
import { Drawable } from "../components/Drawable";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function stepNearMisses(
  world: World,
  passes: NearMissPasses,
  catchOptions: CatchOptions,
): { passes: NearMissPasses; completed: number } {
  const playerEid = query(world, [Player, Position, Drawable])[0];
  if (playerEid === undefined) {
    return { passes, completed: 0 };
  }
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const pr = Drawable.radius[playerEid] ?? 0;
  const samples = [...query(world, [Ghost, GhostPhase, Position, Drawable])]
    .filter((eid) => GhostPhase.value[eid] !== GHOST_PHASE.inHouse)
    .map((eid) => ({
      eid,
      touching: circlesOverlap(
        px,
        py,
        pr,
        Position.x[eid] ?? 0,
        Position.y[eid] ?? 0,
        Drawable.radius[eid] ?? 0,
      ),
      catchable:
        catchOptions.playerInvulnerable !== true &&
        eid !== catchOptions.frozenGhostEid &&
        catchOptions.skipGhostEids?.has(eid) !== true &&
        catchOptions.edibleGhostEids?.has(eid) !== true,
    }));
  return stepNearMissPasses(passes, samples);
}
