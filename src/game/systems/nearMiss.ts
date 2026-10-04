import { query, type World } from "bitecs";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { stepNearMissPasses, type NearMissPasses } from "../../domain/nearMiss";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function stepNearMisses(
  world: World,
  passes: NearMissPasses,
  tileSize: number,
  isCatchable: (ghostEid: number) => boolean,
): { passes: NearMissPasses; completed: number } {
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return { passes, completed: 0 };
  }
  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const samples = [...query(world, [Ghost, GhostPhase, Position])]
    .filter((eid) => GhostPhase.value[eid] !== GHOST_PHASE.inHouse)
    .map((eid) => ({
      eid,
      distancePx: Math.hypot((Position.x[eid] ?? 0) - px, (Position.y[eid] ?? 0) - py),
      catchable: isCatchable(eid),
    }));
  return stepNearMissPasses(passes, samples, tileSize);
}
