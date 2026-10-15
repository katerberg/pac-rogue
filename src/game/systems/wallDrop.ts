import type { World } from "bitecs";
import { getActiveLayout, type SolidGrid } from "../../domain/maze";
import {
  dropWall,
  droppedWallBlocksPlayer,
  walkThroughDroppedWall,
  type RunUpgrades,
  type UpgradeId,
} from "../../domain/upgrades";
import { wallDropCell, withSolidCell } from "../../domain/wallDrop";
import type { Direction } from "../components/Input";
import { CARDINAL_STEP } from "./heldKeys";
import { playerCell } from "./playerCell";
import { playerFacing } from "./playerDirection";

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
