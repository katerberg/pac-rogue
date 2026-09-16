import { query, type World } from "bitecs";
import { resolveGhostSpeed } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { isGhostTunnelSlow, worldToCol, worldToRow } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";

export function applyGhostSpeed(world: World, pelletsRemaining: number): void {
  for (const eid of query(world, [Ghost, GhostPhase, Position, Speed])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      Speed.px[eid] = 0;
      continue;
    }

    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    Speed.px[eid] = resolveGhostSpeed(pelletsRemaining, isGhostTunnelSlow(col, row));
  }
}
