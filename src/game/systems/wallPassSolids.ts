import { getActiveLayout, type SolidGrid } from "../../domain/maze";
import { wallPassLoopOwned, type UpgradeId } from "../../domain/upgrades";

export function wallPassSolids(owned: readonly UpgradeId[]): SolidGrid {
  const layout = getActiveLayout();
  return wallPassLoopOwned(owned) ? layout.wallPassLoopPlayerSolids : layout.wallPassPlayerSolids;
}
