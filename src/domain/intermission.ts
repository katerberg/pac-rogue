import { clamp } from "./clamp";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";

export const INTERMISSION_AFTER_LEVEL = 2;
export const INTERMISSION_MS = 4000;
export const INTERMISSION_ACTOR_SIZE = 56;
export const INTERMISSION_CHASE_GAP_PX = 130;
const BOB_STEP_MS = 120;
const BOB_PX = 3;

export type IntermissionFrame = {
  dotManX: number;
  blinkyX: number;
  y: number;
  bobPx: number;
  done: boolean;
};

export function hasIntermissionAfter(levelIndex: number): boolean {
  return levelIndex === INTERMISSION_AFTER_LEVEL;
}

export function intermissionFrame(elapsedMs: number): IntermissionFrame {
  const progress = clamp(elapsedMs / INTERMISSION_MS, 0, 1);
  const half = INTERMISSION_ACTOR_SIZE / 2;
  const startX = -half - INTERMISSION_CHASE_GAP_PX;
  const endX = PLAYFIELD_WIDTH + half;
  const blinkyX = startX + (endX - startX) * progress;
  const bobUp = Math.floor(elapsedMs / BOB_STEP_MS) % 2 === 0;
  return {
    dotManX: blinkyX + INTERMISSION_CHASE_GAP_PX,
    blinkyX,
    y: PLAYFIELD_HEIGHT / 2,
    bobPx: bobUp ? -BOB_PX : BOB_PX,
    done: elapsedMs >= INTERMISSION_MS,
  };
}
