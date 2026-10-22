import type { GhostDir } from "./ghostPath";
import { PLAYFIELD_HEIGHT } from "./playfieldBounds";

export const INTERMISSION_ACTOR_SIZE = 56;
export const INTERMISSION_PROP_SIZE = 24;
export const INTERMISSION_Y = PLAYFIELD_HEIGHT / 2;
const BOB_STEP_MS = 120;
const BOB_PX = 3;

type At = { key: string; x: number; y: number };

export type IntermissionActor =
  | (At & { kind: "dotMan" })
  | (At & { kind: "ghost"; drawableId: string; facing: GhostDir })
  | (At & { kind: "powerPellet" })
  | (At & { kind: "bananaPeel" });

export type IntermissionBeat = { beat: string; actors: IntermissionActor[] };

export type IntermissionScript = {
  durationMs: number;
  beatAt(elapsedMs: number): IntermissionBeat;
};

export function intermissionBobPx(elapsedMs: number): number {
  return Math.floor(elapsedMs / BOB_STEP_MS) % 2 === 0 ? -BOB_PX : BOB_PX;
}
