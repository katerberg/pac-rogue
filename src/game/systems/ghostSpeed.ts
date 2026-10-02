import { hasComponent, query, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import {
  GHOST_TUNNEL_SPEED,
  resolveBossGhostSpeed,
  resolveGhostSpeedForKind,
} from "../../domain/ghostSpeed";
import { PLAYER_SPEED } from "../../domain/playfield";
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
  heldGhostEids?: ReadonlySet<number>;
  tunnelSpeedRatio?: number | null;
};

export function applyGhostSpeed(
  world: World,
  pelletsRemaining: number,
  levelIndex: number,
  options: GhostSpeedOptions = {},
): void {
  const ghostSpeedMul = options.ghostSpeedMul ?? 1;
  const frozenEid = options.frozenGhostEid ?? null;
  const tunnelSpeed =
    options.tunnelSpeedRatio == null ? GHOST_TUNNEL_SPEED : PLAYER_SPEED * options.tunnelSpeedRatio;

  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Speed])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }

    if ((frozenEid !== null && eid === frozenEid) || options.heldGhostEids?.has(eid) === true) {
      Speed.px[eid] = 0;
      continue;
    }

    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    const inTunnel = isGhostTunnelSlow(col, row);
    const base = hasComponent(world, eid, BossGhost)
      ? resolveBossGhostSpeed(inTunnel, tunnelSpeed)
      : resolveGhostSpeedForKind(
          kind,
          pelletsRemaining,
          inTunnel,
          levelIndex,
          phase === GHOST_PHASE.leaving,
          tunnelSpeed,
        );
    Speed.px[eid] = base * ghostSpeedMul;
  }
}
