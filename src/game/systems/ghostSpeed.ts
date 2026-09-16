import { query, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { resolveGhostSpeedForKind } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { isGhostTunnelSlow, worldToCol, worldToRow } from "../../domain/maze";
import { agentLog } from "../../debug/agentLog";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";

export function applyGhostSpeed(world: World, pelletsRemaining: number): void {
  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Speed])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      Speed.px[eid] = 0;
      continue;
    }

    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    const next = resolveGhostSpeedForKind(kind, pelletsRemaining, isGhostTunnelSlow(col, row));
    // #region agent log
    if (next <= 0) {
      agentLog({
        hypothesisId: "E",
        location: "ghostSpeed.ts:applyGhostSpeed",
        message: "non-positive ghost speed",
        data: { eid, kind, phase, col, row, next, pelletsRemaining },
      });
    }
    // #endregion
    Speed.px[eid] = next;
  }
}
