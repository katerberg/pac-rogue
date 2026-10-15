import type { World } from "bitecs";
import { getActiveLayout, type SolidGrid } from "../../domain/maze";
import {
  dropWall,
  droppedWallBlocksPlayer,
  trackPlayerOnWall,
  type RunUpgrades,
  type UpgradeId,
} from "../../domain/upgrades";
import { wallDropSpot, withSolidCell } from "../../domain/wallDrop";
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

export function trackWallOccupancy(world: World, state: RunUpgrades): RunUpgrades {
  const cell = playerCell(world);
  return cell === null ? state : trackPlayerOnWall(state, cell.col, cell.row);
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
  const spot = wallDropSpot(
    cell.col,
    cell.row,
    CARDINAL_STEP[facingBefore],
    CARDINAL_STEP[playerFacing(world)],
  );
  return spot === null ? state : dropWall(state, spot, owned);
}
