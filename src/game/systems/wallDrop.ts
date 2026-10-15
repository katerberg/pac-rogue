import { query, type World } from "bitecs";
import { getActiveLayout, worldToCol, worldToRow, type SolidGrid } from "../../domain/maze";
import {
  dropWall,
  droppedWallBlocksPlayer,
  walkThroughDroppedWall,
  type RunUpgrades,
  type UpgradeId,
} from "../../domain/upgrades";
import { wallDropCell, withSolidCell } from "../../domain/wallDrop";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import type { Direction } from "../components/Input";
import { CARDINAL_STEP } from "./heldKeys";
import { playerFacing } from "./playerDirection";

function playerCell(world: World): { col: number; row: number } | null {
  const eid = query(world, [Player, Position])[0];
  if (eid === undefined) {
    return null;
  }
  return { col: worldToCol(Position.x[eid] ?? 0), row: worldToRow(Position.y[eid] ?? 0) };
}

export function playerSolidsWithWall(
  state: RunUpgrades,
  wallPassSolids: SolidGrid | undefined,
): SolidGrid | undefined {
  if (wallPassSolids !== undefined) {
    return wallPassSolids;
  }
  const wall = droppedWallBlocksPlayer(state);
  return wall === null ? undefined : withSolidCell(getActiveLayout().playerSolids, wall);
}

export function walkThroughWall(world: World, state: RunUpgrades): RunUpgrades {
  const cell = playerCell(world);
  return cell === null ? state : walkThroughDroppedWall(state, cell.col, cell.row);
}

export function dropWallOnReversal(
  world: World,
  state: RunUpgrades,
  owned: readonly UpgradeId[],
  facingBefore: Direction,
): RunUpgrades {
  const cell = state.wallDropArmed ? playerCell(world) : null;
  if (cell === null) {
    return state;
  }
  const wall = wallDropCell(
    cell.col,
    cell.row,
    CARDINAL_STEP[facingBefore],
    CARDINAL_STEP[playerFacing(world)],
  );
  return wall === null ? state : dropWall(state, wall, owned);
}
