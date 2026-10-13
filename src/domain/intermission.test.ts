import { describe, expect, it } from "vitest";
import {
  INTERMISSION_ACTOR_SIZE,
  INTERMISSION_CHASE_GAP_PX,
  INTERMISSION_MS,
  hasIntermissionAfter,
  intermissionFrame,
} from "./intermission";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";

describe("intermission", () => {
  it("plays only after level 2", () => {
    expect([1, 2, 3, 9].map(hasIntermissionAfter)).toEqual([false, true, false, false]);
  });

  it("starts with both actors off the left edge and Dot-Man ahead of Blinky", () => {
    const frame = intermissionFrame(0);
    const half = INTERMISSION_ACTOR_SIZE / 2;
    expect(frame.dotManX).toBeLessThanOrEqual(-half + 0.001);
    expect(frame.dotManX - frame.blinkyX).toBe(INTERMISSION_CHASE_GAP_PX);
    expect(frame.done).toBe(false);
  });

  it("ends with both actors off the right edge", () => {
    const frame = intermissionFrame(INTERMISSION_MS);
    const half = INTERMISSION_ACTOR_SIZE / 2;
    expect(frame.blinkyX).toBeGreaterThanOrEqual(PLAYFIELD_WIDTH + half - 0.001);
    expect(frame.dotManX).toBeGreaterThan(frame.blinkyX);
    expect(frame.done).toBe(true);
  });

  it("moves both actors right at a steady pace", () => {
    const a = intermissionFrame(1000);
    const b = intermissionFrame(2000);
    expect(b.blinkyX).toBeGreaterThan(a.blinkyX);
    expect(b.dotManX).toBeGreaterThan(a.dotManX);
  });
});
