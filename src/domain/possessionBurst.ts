export const POSSESSION_BURST_MS = 700;
const BURST_SWELL_SHARE = 0.4;
const BURST_SWELL_SCALE = 0.6;
const BURST_SWELL_WOBBLE = 0.1;
const BURST_SWELL_WOBBLES = 3;
const BURST_POP_PEAK_SCALE = 1.5;
const BURST_POP_GROW_SHARE = 0.35;
const BURST_SHARD_COUNT = 8;
const BURST_SHARD_REACH_TILES = 1.8;
const BURST_SHARD_SIZE_TILES = 0.4;

export type PossessionBurst = { eid: number; x: number; y: number; elapsedMs: number };
export type PossessionBurstRender = { eid: number; x: number; y: number; progress: number };

export function tickPossessionBurst(
  burst: PossessionBurst | null,
  deltaMs: number,
): PossessionBurst | null {
  if (burst === null) {
    return null;
  }
  const elapsedMs = burst.elapsedMs + deltaMs;
  return elapsedMs >= POSSESSION_BURST_MS ? null : { ...burst, elapsedMs };
}

export function possessionBurstRender(burst: PossessionBurst | null): PossessionBurstRender | null {
  return burst === null
    ? null
    : {
        eid: burst.eid,
        x: burst.x,
        y: burst.y,
        progress: Math.min(1, burst.elapsedMs / POSSESSION_BURST_MS),
      };
}

/** Scales are large on purpose: sprites snap to whole art pixels, so small overshoots vanish or jump. */
export function possessionBurstLook(progress: number): {
  shellScale: number;
  shellAlpha: number;
  playerScale: number;
  shardProgress: number;
} {
  const t = Math.min(1, Math.max(0, progress));
  if (t < BURST_SWELL_SHARE) {
    const s = t / BURST_SWELL_SHARE;
    return {
      shellScale:
        1 +
        BURST_SWELL_SCALE * s * s +
        BURST_SWELL_WOBBLE * Math.sin(s * Math.PI * 2 * BURST_SWELL_WOBBLES),
      shellAlpha: 1,
      playerScale: 0,
      shardProgress: 0,
    };
  }
  const p = (t - BURST_SWELL_SHARE) / (1 - BURST_SWELL_SHARE);
  const settle = (p - BURST_POP_GROW_SHARE) / (1 - BURST_POP_GROW_SHARE);
  return {
    shellScale: 1,
    shellAlpha: 0,
    playerScale:
      p < BURST_POP_GROW_SHARE
        ? BURST_POP_PEAK_SCALE * (1 - (1 - p / BURST_POP_GROW_SHARE) ** 2)
        : BURST_POP_PEAK_SCALE + (1 - BURST_POP_PEAK_SCALE) * (1 - (1 - settle) ** 2),
    shardProgress: p,
  };
}

export type PossessionBurstShard = { dx: number; dy: number; alpha: number; size: number };

export function possessionBurstShards(
  shardProgress: number,
  tilePx: number,
): PossessionBurstShard[] {
  if (shardProgress <= 0) {
    return [];
  }
  const p = Math.min(1, shardProgress);
  const reach = BURST_SHARD_REACH_TILES * tilePx * (1 - (1 - p) ** 3);
  return Array.from({ length: BURST_SHARD_COUNT }, (_, i) => {
    const angle = ((i + 0.5) / BURST_SHARD_COUNT) * Math.PI * 2;
    return {
      dx: Math.cos(angle) * reach,
      dy: Math.sin(angle) * reach,
      alpha: 1 - p,
      size: tilePx * BURST_SHARD_SIZE_TILES * (1 - p * 0.5),
    };
  });
}
