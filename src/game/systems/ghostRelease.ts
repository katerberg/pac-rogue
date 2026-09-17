import { query, type World } from "bitecs";
import { shouldReleaseKind, type GhostReleaseClock } from "../../domain/ghostRelease";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { GHOST_SPEED } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Speed } from "../components/Speed";

export function ghostRelease(
  world: World,
  clock: GhostReleaseClock,
  collectedCount: number,
  afterLifeRelease = false,
): void {
  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Input, Speed])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      continue;
    }
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    if (!shouldReleaseKind(kind, clock, collectedCount, afterLifeRelease)) {
      continue;
    }
    GhostPhase.value[eid] = GHOST_PHASE.leaving;
    Input.direction[eid] = DIRECTION.up;
    Speed.px[eid] = GHOST_SPEED;
  }
}
