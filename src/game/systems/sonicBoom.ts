import { query, type World } from "bitecs";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { cellCenterX, cellCenterY, worldToCol, worldToRow } from "../../domain/maze";
import {
  sonicBoomBranches,
  sonicBoomTargets,
  type SonicBoomGhost,
  type SonicBoomPlayer,
} from "../../domain/sonicBoom";
import type { UpgradeId } from "../../domain/upgrades";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, type Direction } from "../components/Input";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Velocity } from "../components/Velocity";
import { enteringEmptyCell } from "./enteringEmptyCell";
import { playerFacing } from "./playerDirection";

const HEADINGS: Partial<Record<Direction, { dc: number; dr: number }>> = {
  [DIRECTION.up]: { dc: 0, dr: -1 },
  [DIRECTION.down]: { dc: 0, dr: 1 },
  [DIRECTION.left]: { dc: -1, dr: 0 },
  [DIRECTION.right]: { dc: 1, dr: 0 },
};

export type SonicBoomEcho = { x: number; y: number; dx: number; dy: number; tiles: number };

function boomPlayer(world: World): SonicBoomPlayer | null {
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return null;
  }
  return {
    x: Position.x[playerEid] ?? 0,
    y: Position.y[playerEid] ?? 0,
    heading: HEADINGS[playerFacing(world)] ?? { dc: 0, dr: 0 },
  };
}

export function sonicBoomWorldTargets(world: World, owned: readonly UpgradeId[]): number[] {
  const player = boomPlayer(world);
  if (player === null) {
    return [];
  }
  const ghosts: SonicBoomGhost[] = [];
  for (const eid of query(world, [Ghost, GhostPhase, Position])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      ghosts.push({ eid, x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 });
    }
  }
  return sonicBoomTargets(owned, player, ghosts);
}

export function movingOverClearedTile(world: World): boolean {
  const playerEid = query(world, [Player, Velocity])[0];
  return (
    playerEid !== undefined &&
    ((Velocity.x[playerEid] ?? 0) !== 0 || (Velocity.y[playerEid] ?? 0) !== 0) &&
    enteringEmptyCell(world)
  );
}

export class SonicBoomEchoes {
  private junction: string | null = null;

  reset(): void {
    this.junction = null;
  }

  step(world: World, owned: readonly UpgradeId[], atSpeed: boolean): SonicBoomEcho[] {
    const player = atSpeed ? boomPlayer(world) : null;
    const branches = player === null ? [] : sonicBoomBranches(owned, player);
    if (player === null || branches.length === 0) {
      this.junction = null;
      return [];
    }
    const col = worldToCol(player.x);
    const row = worldToRow(player.y);
    const key = `${col},${row}`;
    if (key === this.junction) {
      return [];
    }
    this.junction = key;
    return branches
      .filter((b) => b.cells.length > 0)
      .map((b) => ({
        x: cellCenterX(col),
        y: cellCenterY(row),
        dx: b.dc,
        dy: b.dr,
        tiles: b.cells.length,
      }));
  }
}
