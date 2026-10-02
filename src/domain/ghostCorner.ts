import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import {
  blinkyScatterTarget,
  clydeScatterTarget,
  inkyScatterTarget,
  pinkyScatterTarget,
  type GhostTarget,
} from "./ghostTarget";
import { getActiveLayout, isDoor, isHouse, isTunnelMouth, isWalkable, type MazeTile } from "./maze";

export const CORNER_TELEPORT_PLAYER_SAFE_TILES = 8;

export function scatterTargetForKind(kind: GhostKindId): GhostTarget {
  switch (kind) {
    case GHOST_KIND.pinky:
      return pinkyScatterTarget();
    case GHOST_KIND.inky:
      return inkyScatterTarget();
    case GHOST_KIND.clyde:
      return clydeScatterTarget();
    default:
      return blinkyScatterTarget();
  }
}

export function ghostCornerCell(target: GhostTarget): MazeTile {
  const layout = getActiveLayout();
  let best: MazeTile | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      if (
        !isWalkable(col, row, layout.playerSolids) ||
        isHouse(col, row) ||
        isDoor(col, row) ||
        isTunnelMouth(col, row)
      ) {
        continue;
      }
      const dist = Math.abs(col - target.col) + Math.abs(row - target.row);
      if (dist < bestDist) {
        bestDist = dist;
        best = { col, row };
      }
    }
  }
  return best ?? layout.ghostHouseExit;
}

export function ghostTeleportCell(target: GhostTarget, player: MazeTile): MazeTile {
  const corner = ghostCornerCell(target);
  const nearPlayer =
    Math.hypot(corner.col - player.col, corner.row - player.row) <=
    CORNER_TELEPORT_PLAYER_SAFE_TILES;
  return nearPlayer ? getActiveLayout().ghostHouseExit : corner;
}
