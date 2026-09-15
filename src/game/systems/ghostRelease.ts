import { query, type World } from "bitecs";
import { shouldReleaseGhost, type GhostReleaseClock } from "../../domain/ghostRelease";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Speed } from "../components/Speed";

export function ghostRelease(world: World, clock: GhostReleaseClock): void {
  if (!shouldReleaseGhost(clock)) {
    return;
  }

  for (const eid of query(world, [Ghost, GhostPhase, Input, Speed])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      continue;
    }
    GhostPhase.value[eid] = GHOST_PHASE.leaving;
    Input.direction[eid] = DIRECTION.up;
    Speed.px[eid] = GHOST_SPEED;
  }
}
