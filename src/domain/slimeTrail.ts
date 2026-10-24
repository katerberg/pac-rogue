import type { SlimeScope } from "./bossRules";
import { circlesOverlap } from "./circles";
import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { cellCenterX, cellCenterY, type MazeTile } from "./maze";
import { ghostRadius } from "./playfield";

export type SlimeTrails = ReadonlyMap<number, readonly MazeTile[]>;

export function slimesInScope(scope: SlimeScope, kind: GhostKindId): boolean {
  return scope === "all" || (scope === "blinky" && kind === GHOST_KIND.blinky);
}

export function pushSlimeTile(
  trail: readonly MazeTile[],
  tile: MazeTile,
  maxLen: number,
): readonly MazeTile[] {
  const last = trail[trail.length - 1];
  if (last?.col === tile.col && last.row === tile.row) {
    return trail;
  }
  return [...trail, tile].slice(-maxLen);
}

export function slimeOwnerTouching(
  trails: SlimeTrails,
  x: number,
  y: number,
  radius: number,
): number | null {
  const hazardRadius = ghostRadius();
  for (const [eid, tiles] of trails) {
    if (
      tiles.some((tile) =>
        circlesOverlap(x, y, radius, cellCenterX(tile.col), cellCenterY(tile.row), hazardRadius),
      )
    ) {
      return eid;
    }
  }
  return null;
}
