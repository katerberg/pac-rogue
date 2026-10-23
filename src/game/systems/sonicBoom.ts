import { query, type World } from "bitecs";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import { sonicBoomTargets, type SonicBoomGhost } from "../../domain/sonicBoom";
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

export function sonicBoomWorldTargets(world: World, owned: readonly UpgradeId[]): number[] {
  const playerEid = query(world, [Player, Position])[0];
  if (playerEid === undefined) {
    return [];
  }
  const ghosts: SonicBoomGhost[] = [];
  for (const eid of query(world, [Ghost, GhostPhase, Position])) {
    if ((GhostPhase.value[eid] ?? GHOST_PHASE.inHouse) !== GHOST_PHASE.inHouse) {
      ghosts.push({ eid, x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 });
    }
  }
  return sonicBoomTargets(
    owned,
    {
      x: Position.x[playerEid] ?? 0,
      y: Position.y[playerEid] ?? 0,
      heading: HEADINGS[playerFacing(world)] ?? { dc: 0, dr: 0 },
    },
    ghosts,
  );
}

export function movingOverClearedTile(world: World): boolean {
  const playerEid = query(world, [Player, Velocity])[0];
  return (
    playerEid !== undefined &&
    ((Velocity.x[playerEid] ?? 0) !== 0 || (Velocity.y[playerEid] ?? 0) !== 0) &&
    enteringEmptyCell(world)
  );
}
