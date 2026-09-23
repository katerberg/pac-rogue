import { query, type World } from "bitecs";
import { circlesOverlap } from "../../domain/circles";
import type { GhostTarget } from "../../domain/ghostTarget";
import { cellCenterX, cellCenterY } from "../../domain/maze";
import { ghostRadius } from "../../domain/playfield";
import { Drawable } from "../components/Drawable";
import { Player } from "../components/Player";
import { Position } from "../components/Position";

export function slimeTrailKill(
  world: World,
  trail: readonly GhostTarget[],
  options?: { playerInvulnerable?: boolean },
): boolean {
  if (options?.playerInvulnerable === true || trail.length === 0) {
    return false;
  }

  const players = query(world, [Player, Position, Drawable]);
  const playerEid = players[0];
  if (playerEid === undefined) {
    return false;
  }

  const px = Position.x[playerEid] ?? 0;
  const py = Position.y[playerEid] ?? 0;
  const pr = Drawable.radius[playerEid] ?? 0;
  const hazardRadius = ghostRadius();

  for (const tile of trail) {
    const tx = cellCenterX(tile.col);
    const ty = cellCenterY(tile.row);
    if (circlesOverlap(px, py, pr, tx, ty, hazardRadius)) {
      return true;
    }
  }

  return false;
}
