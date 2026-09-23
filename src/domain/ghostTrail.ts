import type { GhostTarget } from "./ghostTarget";

export type TrailPushResult = {
  trail: GhostTarget[];
  added: GhostTarget | null;
  removed: GhostTarget | null;
};

function sameTile(a: GhostTarget, b: GhostTarget): boolean {
  return a.col === b.col && a.row === b.row;
}

export function pushTrailTile(
  trail: readonly GhostTarget[],
  tile: GhostTarget,
  maxLen: number,
): TrailPushResult {
  const last = trail[trail.length - 1];
  if (last && sameTile(last, tile)) {
    return { trail: [...trail], added: null, removed: null };
  }

  const next = [...trail, tile];
  let removed: GhostTarget | null = null;
  while (next.length > maxLen) {
    removed = next.shift() ?? null;
  }

  return { trail: next, added: tile, removed };
}
