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

export function simulacrumSpawnTiles(layout: SpawnLayout, copies: number): MazeTile[] {
  if (copies <= 0) {
    return [];
  }
  const bottom = copies > 1 ? bottomCenterTile(layout.playerSolids) : null;
  return bottom === null ? [layout.ghostHouseExit] : [layout.ghostHouseExit, bottom];
}
