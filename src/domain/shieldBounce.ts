export const SHIELD_BOUNCE_MS = 300;
export const SHIELD_BOUNCE_TILES = 1.5;
export const GHOST_WALL_STUN_MS = 750;
const ARC_PEAK_TILES = 0.4;
const STUN_SHAKE_PX = 1.5;
const STUN_SHAKE_PERIOD_MS = 80;

export type BounceStep = { dx: number; dy: number };
export type BounceBody = { eid: number; step: BounceStep; elapsedMs: number };
export type GhostStun = { eid: number; remainingMs: number };
export type ShieldBounce = {
  player: BounceBody | null;
  ghosts: BounceBody[];
  stunned: GhostStun[];
};

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

export function stunShakePx(remainingMs: number): number {
  return STUN_SHAKE_PX * Math.sin((2 * Math.PI * remainingMs) / STUN_SHAKE_PERIOD_MS);
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
): Record<number, Point> | undefined {
  const bodies = bounce.player === null ? bounce.ghosts : [bounce.player, ...bounce.ghosts];
  if (bodies.length === 0 && bounce.stunned.length === 0) {
    return undefined;
  }
  return Object.fromEntries([
    ...bodies.map((body) => [body.eid, { x: 0, y: -bounceArcPx(body.elapsedMs, tileSize) }]),
    ...bounce.stunned.map((stun) => [stun.eid, { x: stunShakePx(stun.remainingMs), y: 0 }]),
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
