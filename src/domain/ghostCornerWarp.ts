import {
  tickWarpGlide,
  warpGlideRemainingMs,
  warpGlideSprites,
  type WarpGlide,
  type WarpGlideSprite,
} from "./warpGlide";

export type GhostCornerWarp = { eid: number; glide: WarpGlide | null; holdMs: number };

export function mergeGhostCornerWarps(
  current: readonly GhostCornerWarp[],
  incoming: readonly GhostCornerWarp[],
): GhostCornerWarp[] {
  const replaced = new Set(incoming.map((warp) => warp.eid));
  return [...current.filter((warp) => !replaced.has(warp.eid)), ...incoming];
}

export function tickGhostCornerWarps(
  warps: readonly GhostCornerWarp[],
  deltaMs: number,
): GhostCornerWarp[] {
  const next: GhostCornerWarp[] = [];
  for (const warp of warps) {
    if (warp.glide !== null) {
      const glide = tickWarpGlide(warp.glide, deltaMs);
      if (glide !== null || warp.holdMs > 0) {
        next.push({ ...warp, glide });
      }
      continue;
    }
    const holdMs = warp.holdMs - Math.max(0, deltaMs);
    if (holdMs > 0) {
      next.push({ ...warp, holdMs });
    }
  }
  return next;
}

export function heldGhostEids(warps: readonly GhostCornerWarp[]): Set<number> {
  return new Set(warps.map((warp) => warp.eid));
}

export function glidingGhostEids(warps: readonly GhostCornerWarp[]): Set<number> {
  return new Set(warps.filter((warp) => warp.glide !== null).map((warp) => warp.eid));
}

export function ghostWarpGlideRemainingMs(warps: readonly GhostCornerWarp[]): number {
  return Math.max(0, ...warps.map((warp) => warpGlideRemainingMs(warp.glide)));
}

export function ghostWarpGlideSprites(
  warps: readonly GhostCornerWarp[],
): Record<number, WarpGlideSprite[]> | undefined {
  const gliding = warps.filter((warp) => warp.glide !== null);
  if (gliding.length === 0) {
    return undefined;
  }
  return Object.fromEntries(gliding.map((warp) => [warp.eid, warpGlideSprites(warp.glide!)]));
}
