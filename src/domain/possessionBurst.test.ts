import { describe, expect, it } from "vitest";
import {
  POSSESSION_BURST_MS,
  possessionBurstLook,
  possessionBurstRender,
  possessionBurstShards,
  tickPossessionBurst,
} from "./possessionBurst";

describe("possession burst", () => {
  it("ticks until the burst ends", () => {
    const burst = { eid: 5, x: 1, y: 2, elapsedMs: 0 };
    const mid = tickPossessionBurst(burst, 300)!;
    expect(mid.elapsedMs).toBe(300);
    expect(tickPossessionBurst(mid, POSSESSION_BURST_MS)).toBeNull();
    expect(tickPossessionBurst(null, 16)).toBeNull();
  });

  it("reports progress for the renderer", () => {
    expect(possessionBurstRender({ eid: 5, x: 1, y: 2, elapsedMs: 0 })).toEqual({
      eid: 5,
      x: 1,
      y: 2,
      progress: 0,
    });
    expect(
      possessionBurstRender({ eid: 5, x: 1, y: 2, elapsedMs: POSSESSION_BURST_MS / 2 })!.progress,
    ).toBeCloseTo(0.5);
    expect(possessionBurstRender(null)).toBeNull();
  });

  it("swells the shell with Dot-Man hidden inside", () => {
    const start = possessionBurstLook(0);
    expect(start).toMatchObject({ shellScale: 1, shellAlpha: 1, playerScale: 0, shardProgress: 0 });
    const late = possessionBurstLook(0.39);
    expect(late.shellAlpha).toBe(1);
    expect(late.shellScale).toBeGreaterThan(1.2);
    expect(late.playerScale).toBe(0);
  });

  it("shatters the shell and pops Dot-Man out past full size before settling", () => {
    const pop = [0.45, 0.6, 0.75, 0.9].map((t) => possessionBurstLook(t));
    for (const look of pop) {
      expect(look.shellAlpha).toBe(0);
      expect(look.shardProgress).toBeGreaterThan(0);
    }
    expect(Math.max(...pop.map((look) => look.playerScale))).toBeGreaterThan(1.4);
    expect(possessionBurstLook(1)).toMatchObject({ playerScale: 1, shardProgress: 1 });
  });

  it("flies shards outward and fades them out", () => {
    expect(possessionBurstShards(0, 16)).toEqual([]);
    const near = possessionBurstShards(0.1, 16);
    const far = possessionBurstShards(0.8, 16);
    expect(far.length).toBeGreaterThan(0);
    expect(Math.hypot(far[0]!.dx, far[0]!.dy)).toBeGreaterThan(
      Math.hypot(near[0]!.dx, near[0]!.dy),
    );
    expect(far[0]!.alpha).toBeLessThan(near[0]!.alpha);
    expect(possessionBurstShards(1, 16).every((shard) => shard.alpha === 0)).toBe(true);
  });
});
