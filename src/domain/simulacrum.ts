import type { MazeTile, SolidGrid } from "./maze";

type SpawnLayout = { ghostHouseExit: MazeTile; playerSolids: SolidGrid };

function bottomCenterTile(solids: SolidGrid): MazeTile | null {
  const center = ((solids[0]?.length ?? 0) - 1) / 2;
  for (let row = solids.length - 1; row >= 0; row -= 1) {
    const open = solids[row]!.flatMap((solid, col) => (solid ? [] : [col]));
    const best = open.reduce<number | null>(
      (pick, col) =>
        pick === null || Math.abs(col - center) < Math.abs(pick - center) ? col : pick,
      null,
    );
    if (best !== null) {
      return { col: best, row };
    }
  }
  return null;
}

export function simulacrumSpawnTiles(
  layout: SpawnLayout,
  copies: number,
  blocked: readonly MazeTile[] = [],
): MazeTile[] {
  const bottom = bottomCenterTile(layout.playerSolids);
  const candidates = [layout.ghostHouseExit, ...(bottom === null ? [] : [bottom])];
  return candidates
    .filter((tile) => !blocked.some(({ col, row }) => col === tile.col && row === tile.row))
    .slice(0, Math.max(0, copies));
}
