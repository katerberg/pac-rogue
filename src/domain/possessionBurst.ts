const BURST_SWELL_MS = 840;
const BURST_POP_MS = 420;
export const POSSESSION_BURST_MS = BURST_SWELL_MS + BURST_POP_MS;
const BURST_SWELL_SHARE = BURST_SWELL_MS / POSSESSION_BURST_MS;
const BURST_PULSE_PEAK = { at: 0.35, scale: 1.9 };
const BURST_PULSE_DIP = { at: 0.55, scale: 1.55 };
const BURST_EXPLODE_SCALE = 3;
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

function shellPulseScale(s: number): number {
  const ease = (from: number, to: number, k: number): number => from + (to - from) * k;
  const smooth = (k: number): number => k * k * (3 - 2 * k);
  if (s < BURST_PULSE_PEAK.at) {
    return ease(1, BURST_PULSE_PEAK.scale, smooth(s / BURST_PULSE_PEAK.at));
  }
  if (s < BURST_PULSE_DIP.at) {
    const k = (s - BURST_PULSE_PEAK.at) / (BURST_PULSE_DIP.at - BURST_PULSE_PEAK.at);
    return ease(BURST_PULSE_PEAK.scale, BURST_PULSE_DIP.scale, smooth(k));
  }
  const k = (s - BURST_PULSE_DIP.at) / (1 - BURST_PULSE_DIP.at);
  return ease(BURST_PULSE_DIP.scale, BURST_EXPLODE_SCALE, k * k);
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
    return {
      shellScale: shellPulseScale(t / BURST_SWELL_SHARE),
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
