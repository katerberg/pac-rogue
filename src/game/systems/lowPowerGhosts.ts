import { query, type World } from "bitecs";
import type { GhostKindId } from "../../domain/ghostKind";
import {
  LOW_POWER_TRACTION_DRAG_MS,
  lowPowerTractionCopies,
  lowPowerTractionMul,
} from "../../domain/lowPowerUpgrades";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import { isGhostTunnelSlow, worldToCol, worldToRow } from "../../domain/maze";
import type { UpgradeId } from "../../domain/upgrades";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function playerInTunnel(world: World): boolean {
  const eid = query(world, [Player, Position])[0];
  return (
    eid !== undefined &&
    isGhostTunnelSlow(worldToCol(Position.x[eid] ?? 0), worldToRow(Position.y[eid] ?? 0))
  );
}

export class GhostTractionState {
  private lastFacing = new Map<number, number>();
  private dragMs = new Map<number, number>();

  reset(): void {
    this.lastFacing.clear();
    this.dragMs.clear();
  }

  tick(world: World, owned: readonly UpgradeId[], deltaMs: number): void {
    for (const [eid, ms] of this.dragMs) {
      if (ms <= deltaMs) {
        this.dragMs.delete(eid);
      } else {
        this.dragMs.set(eid, ms - deltaMs);
      }
    }
    for (const eid of query(world, [Ghost, GhostKind, GhostPhase, Facing])) {
      if (GhostPhase.value[eid] !== GHOST_PHASE.active) {
        continue;
      }
      const facing = Facing.direction[eid] ?? 0;
      const previous = this.lastFacing.get(eid);
      this.lastFacing.set(eid, facing);
      const kind = (GhostKind.kind[eid] ?? 0) as GhostKindId;
      if (
        previous !== undefined &&
        previous !== facing &&
        lowPowerTractionCopies(owned, kind) > 0
      ) {
        this.dragMs.set(eid, LOW_POWER_TRACTION_DRAG_MS);
      }
    }
  }

  multiplier(eid: number, owned: readonly UpgradeId[], kind: GhostKindId): number {
    return this.dragMs.has(eid) ? lowPowerTractionMul(lowPowerTractionCopies(owned, kind)) : 1;
  }
}
