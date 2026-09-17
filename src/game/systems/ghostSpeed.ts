import { query, type World } from "bitecs";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { resolveGhostSpeedForKind } from "../../domain/ghostSpeed";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { isGhostTunnelSlow, worldToCol, worldToRow } from "../../domain/maze";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";

export type GhostSpeedOptions = {
  ghostSpeedMul?: number;
  frozen?: boolean;
};

export function applyGhostSpeed(
  world: World,
  pelletsRemaining: number,
  options: GhostSpeedOptions = {},
): void {
  const ghostSpeedMul = options.ghostSpeedMul ?? 1;
  const frozen = options.frozen === true;

  for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Position, Speed])) {
    const phase = GhostPhase.value[eid] ?? GHOST_PHASE.inHouse;
    if (phase === GHOST_PHASE.inHouse) {
      continue;
    }

    if (frozen) {
      Speed.px[eid] = 0;
      continue;
    }

    const col = worldToCol(Position.x[eid] ?? 0);
    const row = worldToRow(Position.y[eid] ?? 0);
    const kind = (GhostKind.kind[eid] ?? GHOST_KIND.blinky) as GhostKindId;
    Speed.px[eid] =
      resolveGhostSpeedForKind(kind, pelletsRemaining, isGhostTunnelSlow(col, row)) * ghostSpeedMul;
  }
}
