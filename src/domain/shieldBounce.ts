export const SHIELD_BOUNCE_MS = 300;
export const SHIELD_BOUNCE_TILES = 1.5;
export const GHOST_WALL_STUN_MS = 750;
const ARC_PEAK_TILES = 0.4;
/** Slight tip while slipping, radians (~18°). */
const SLIP_PEAK_RAD = 0.32;
/** Overshoot past upright while recovering, radians (~-9°). */
const OVERCORRECT_RAD = -0.16;

export type BounceStep = { dx: number; dy: number };
export type BounceBody = { eid: number; step: BounceStep; elapsedMs: number };
export type GhostStun = { eid: number; remainingMs: number; slipSign: number };
export type ShieldBounce = {
  player: BounceBody | null;
  ghosts: BounceBody[];
  stunned: GhostStun[];
};
export type SpriteOffset = { x: number; y: number; rotation?: number };

export const NO_SHIELD_BOUNCE: ShieldBounce = { player: null, ghosts: [], stunned: [] };

type Point = { x: number; y: number };

export function bounceAwaySteps(
  player: Point,
  ghost: Point,
  fallback: BounceStep,
): { player: BounceStep; ghost: BounceStep } {
  const dx = player.x - ghost.x;
  const dy = player.y - ghost.y;
  const away =
    dx === 0 && dy === 0
      ? fallback
      : Math.abs(dx) >= Math.abs(dy)
        ? { dx: Math.sign(dx), dy: 0 }
        : { dx: 0, dy: Math.sign(dy) };
  return { player: away, ghost: { dx: 0 - away.dx, dy: 0 - away.dy } };
}

export function bounceSlipSign(step: BounceStep): number {
  return step.dx !== 0 ? Math.sign(step.dx) : Math.sign(step.dy) || 1;
}

function easeOut(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - (1 - clamped) * (1 - clamped);
}

export function bounceTravelPx(elapsedMs: number, deltaMs: number, tileSize: number): number {
  const distance = SHIELD_BOUNCE_TILES * tileSize;
  const from = easeOut(elapsedMs / SHIELD_BOUNCE_MS);
  const to = easeOut((elapsedMs + Math.max(0, deltaMs)) / SHIELD_BOUNCE_MS);
  return distance * (to - from);
}

export function bounceArcPx(elapsedMs: number, tileSize: number): number {
  const t = Math.min(1, Math.max(0, elapsedMs / SHIELD_BOUNCE_MS));
  return ARC_PEAK_TILES * tileSize * Math.sin(Math.PI * t);
}

/**
 * Wall-stun slip pose over GHOST_WALL_STUN_MS: tip (slip) → overcorrect → settle → hold steady.
 * `remainingMs` counts down from GHOST_WALL_STUN_MS; `slipSign` is the bounce travel direction.
 */
export function stunSlipRotation(remainingMs: number, slipSign: number): number {
  const elapsed = GHOST_WALL_STUN_MS - Math.max(0, remainingMs);
  const t = Math.min(1, Math.max(0, elapsed / GHOST_WALL_STUN_MS));
  const sign = slipSign === 0 ? 1 : Math.sign(slipSign);
  const keys: { at: number; angle: number }[] = [
    { at: 0, angle: 0 },
    { at: 0.18, angle: SLIP_PEAK_RAD },
    { at: 0.4, angle: OVERCORRECT_RAD },
    { at: 0.7, angle: 0 },
    { at: 1, angle: 0 },
  ];
  for (let i = 1; i < keys.length; i += 1) {
    const prev = keys[i - 1]!;
    const next = keys[i]!;
    if (t <= next.at) {
      const u = (t - prev.at) / (next.at - prev.at);
      const smooth = u * u * (3 - 2 * u);
      return sign * (prev.angle + (next.angle - prev.angle) * smooth);
    }
  }
  return 0;
}

export function mergeShieldBounce(current: ShieldBounce, incoming: ShieldBounce): ShieldBounce {
  const replaced = new Set(incoming.ghosts.map((body) => body.eid));
  return {
    player: incoming.player ?? current.player,
    ghosts: [...current.ghosts.filter((body) => !replaced.has(body.eid)), ...incoming.ghosts],
    stunned: current.stunned.filter((stun) => !replaced.has(stun.eid)),
  };
}

export function shieldBounceCatchSkips(bounce: ShieldBounce): Set<number> {
  return new Set([
    ...bounce.ghosts.map((body) => body.eid),
    ...(bounce.player === null ? [] : bounce.stunned.map((stun) => stun.eid)),
  ]);
}

export function shieldBounceHeldGhosts(bounce: ShieldBounce): Set<number> {
  return new Set([
    ...bounce.ghosts.map((body) => body.eid),
    ...bounce.stunned.map((stun) => stun.eid),
  ]);
}

export function shieldBounceSpriteOffsets(
  bounce: ShieldBounce,
  tileSize: number,
): Record<number, SpriteOffset> | undefined {
  const bodies = bounce.player === null ? bounce.ghosts : [bounce.player, ...bounce.ghosts];
  if (bodies.length === 0 && bounce.stunned.length === 0) {
    return undefined;
  }
  return Object.fromEntries([
    ...bodies.map((body) => [body.eid, { x: 0, y: -bounceArcPx(body.elapsedMs, tileSize) }]),
    ...bounce.stunned.map((stun) => [
      stun.eid,
      { x: 0, y: 0, rotation: stunSlipRotation(stun.remainingMs, stun.slipSign) },
    ]),
  ]);
}

export function maskStaleKeys<K extends string>(
  keys: Record<K, number | null>,
  stale: Record<K, number | null> | null,
): Record<K, number | null> {
  if (stale === null) {
    return keys;
  }
  const masked = { ...keys };
  for (const key of Object.keys(keys) as K[]) {
    if (keys[key] !== null && keys[key] === stale[key]) {
      masked[key] = null;
    }
  }
  return masked;
}
