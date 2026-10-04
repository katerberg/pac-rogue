import { nearestWalkableCellCenter, playerSpawnCenter } from "./maze";
import { martyrGhostPlacement, type UpgradeId } from "./upgrades";

type Point = { x: number; y: number };

export function respawnCenter(owned: readonly UpgradeId[], fell: Point | null): Point {
  if (fell === null || martyrGhostPlacement(owned) === null) {
    return playerSpawnCenter();
  }
  return nearestWalkableCellCenter(fell.x, fell.y);
}
