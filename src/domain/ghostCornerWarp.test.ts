import { describe, expect, it } from "vitest";
import {
  ghostWarpGlideRemainingMs,
  ghostWarpGlideSprites,
  glidingGhostEids,
  heldGhostEids,
  mergeGhostCornerWarps,
  tickGhostCornerWarps,
  type GhostCornerWarp,
} from "./ghostCornerWarp";
import { startWarpGlide, WARP_GLIDE_MS } from "./warpGlide";

const from = { x: 0, y: 0 };
const to = { x: 100, y: 0 };

function warp(eid: number, holdMs: number): GhostCornerWarp {
  return { eid, glide: startWarpGlide(from, to), holdMs };
}

describe("ghostCornerWarp", () => {
  it("glides, then holds for holdMs, then drops the ghost", () => {
    let warps = [warp(1, 0), warp(2, 1000)];
    expect(ghostWarpGlideRemainingMs(warps)).toBe(WARP_GLIDE_MS);
    expect(glidingGhostEids(warps)).toEqual(new Set([1, 2]));
    expect(Object.keys(ghostWarpGlideSprites(warps)!)).toEqual(["1", "2"]);

    warps = tickGhostCornerWarps(warps, WARP_GLIDE_MS);
    expect(warps.map((w) => w.eid)).toEqual([2]);
    expect(glidingGhostEids(warps).size).toBe(0);
    expect(heldGhostEids(warps)).toEqual(new Set([2]));
    expect(ghostWarpGlideSprites(warps)).toBeUndefined();
    expect(ghostWarpGlideRemainingMs(warps)).toBe(0);

    warps = tickGhostCornerWarps(warps, 999);
    expect(heldGhostEids(warps)).toEqual(new Set([2]));
    expect(tickGhostCornerWarps(warps, 1)).toEqual([]);
  });

  it("restarts a ghost's warp when it is teleported again", () => {
    const first = tickGhostCornerWarps([warp(1, 0), warp(2, 0)], 200);
    const merged = mergeGhostCornerWarps(first, [warp(1, 500)]);
    expect(merged.map((w) => [w.eid, w.glide?.elapsedMs, w.holdMs])).toEqual([
      [2, 200, 0],
      [1, 0, 500],
    ]);
  });
});
