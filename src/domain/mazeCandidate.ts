/** Seed index attempts before giving up on filling `count` successes. */
export const CANDIDATE_SEED_ATTEMPT_CEILING = 20_000;
export const MAZE_CANDIDATES_VERSION = 1 as const;

export type MazeCandidate = {
  id: number;
  seed: string;
  seedUsed: string;
  ascii: string;
  pelletCount: number;
  tunnels: number[];
};

export type MazeCandidatesFile = {
  version: typeof MAZE_CANDIDATES_VERSION;
  generatedAt: string;
  count: number;
  candidates: MazeCandidate[];
};

export function candidateSeed(index: number): string {
  return `pool-cand-${index}`;
}

export function tunnelRowsFromLayout(layout: {
  cols: number;
  rows: number;
  playerSolids: ReadonlyArray<ReadonlyArray<boolean>>;
}): number[] {
  const found: number[] = [];
  for (let row = 0; row < layout.rows; row += 1) {
    const leftSolid = layout.playerSolids[row]?.[0] ?? true;
    const rightSolid = layout.playerSolids[row]?.[layout.cols - 1] ?? true;
    if (!leftSolid && !rightSolid) {
      found.push(row);
    }
  }
  return found;
}
