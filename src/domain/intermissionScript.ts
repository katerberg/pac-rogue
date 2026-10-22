import type { GhostDir } from "./ghostPath";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

export const INTERMISSION_ACTOR_SIZE = 56;
export const INTERMISSION_PELLET_SIZE = 24;
export const INTERMISSION_PEEL_SIZE = 40;
export const INTERMISSION_SHIELD_SIZE = 72;
export const INTERMISSION_Y = PLAYFIELD_HEIGHT / 2;
export const INTERMISSION_HALF = INTERMISSION_ACTOR_SIZE / 2;
export const INTERMISSION_PELLET_X = 520;
export const INTERMISSION_PELLET_MS = 2000;
export const INTERMISSION_DOT_MAN_SPEED =
  (INTERMISSION_PELLET_X + INTERMISSION_HALF) / INTERMISSION_PELLET_MS;
const OFF_LEFT_X = -INTERMISSION_HALF;
const OFF_RIGHT_X = PLAYFIELD_WIDTH + INTERMISSION_HALF;
const BOB_STEP_MS = 120;
const BOB_PX = 3;

type At = { key: string; x: number; y: number; alpha?: number };

export type IntermissionGhostLook = "normal" | "frozen";

export type IntermissionActor =
  | (At & { kind: "dotMan"; flipX?: boolean; tint?: number; size?: number })
  | (At & { kind: "ghost"; drawableId: string; facing: GhostDir; look?: IntermissionGhostLook })
  | (At & { kind: "powerPellet" })
  | (At & { kind: "bananaPeel" })
  | (At & { kind: "bubbleShield" });

export type IntermissionBeat = { beat: string; actors: IntermissionActor[] };

export type IntermissionScript = {
  durationMs: number;
  beatAt(elapsedMs: number): IntermissionBeat;
};

export function intermissionBobPx(elapsedMs: number): number {
  return Math.floor(elapsedMs / BOB_STEP_MS) % 2 === 0 ? -BOB_PX : BOB_PX;
}

export function dotManApproachX(elapsedMs: number): number {
  return OFF_LEFT_X + INTERMISSION_DOT_MAN_SPEED * elapsedMs;
}

export function walkingDotMan(elapsedMs: number): IntermissionActor {
  return {
    kind: "dotMan",
    key: "dotMan",
    x: dotManApproachX(elapsedMs),
    y: INTERMISSION_Y - intermissionBobPx(elapsedMs),
  };
}

export function chaserX(elapsedMs: number, gapAtPelletPx: number, speed: number): number {
  return INTERMISSION_PELLET_X - gapAtPelletPx + speed * (elapsedMs - INTERMISSION_PELLET_MS);
}

export function pelletActors(elapsedMs: number): IntermissionActor[] {
  return elapsedMs < INTERMISSION_PELLET_MS
    ? [{ kind: "powerPellet", key: "pellet", x: INTERMISSION_PELLET_X, y: INTERMISSION_Y }]
    : [];
}

export function msToLeave(x: number, y: number, vx: number, vy = 0): number {
  const toX = vx > 0 ? (OFF_RIGHT_X - x) / vx : vx < 0 ? (x - OFF_LEFT_X) / -vx : Infinity;
  const toY =
    vy > 0
      ? (PLAYFIELD_HEIGHT + INTERMISSION_HALF - y) / vy
      : vy < 0
        ? (y + INTERMISSION_HALF) / -vy
        : Infinity;
  return Math.min(toX, toY);
}

export function bounceArc(
  t: number,
  fromX: number,
  backPx: number,
  hopPx: number,
): { x: number; y: number } {
  return { x: fromX - backPx * t, y: INTERMISSION_Y - Math.sin(Math.PI * t) * hopPx };
}

export function beatAtMs(
  elapsedMs: number,
  beats: readonly (readonly [name: string, untilMs: number])[],
  last: string,
): string {
  return beats.find(([, untilMs]) => elapsedMs < untilMs)?.[0] ?? last;
}
