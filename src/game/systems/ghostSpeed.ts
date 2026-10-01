import { hasComponent, query, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { resolveBossGhostSpeed, resolveGhostSpeedForKind } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { isGhostTunnelSlow, worldToCol, worldToRow } from "../../domain/maze";
import { BossGhost } from "../components/BossGhost";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";

export type GhostSpeedOptions = {
  ghostSpeedMul?: number;
  frozenGhostEid?: number | null;
};

export function applyGhostSpeed(
  world: World,
  pelletsRemaining: number,
  levelIndex: number,
  options: GhostSpeedOptions = {},
): void {
  const ghostSpeedMul = options.ghostSpeedMul ?? 1;
  const frozenEid = options.frozenGhostEid ?? null;

  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Speed])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }

    if (frozenEid !== null && eid === frozenEid) {
      Speed.px[eid] = 0;
      continue;
    }

    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    const inTunnel = isGhostTunnelSlow(col, row);
    const base = hasComponent(world, eid, BossGhost)
      ? resolveBossGhostSpeed(inTunnel)
      : resolveGhostSpeedForKind(
          kind,
          pelletsRemaining,
          inTunnel,
          levelIndex,
          phase === GHOST_PHASE.leaving,
        );
    Speed.px[eid] = base * ghostSpeedMul;
  }
}
