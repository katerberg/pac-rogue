import { describe, expect, it } from "vitest";
import {
  INTERMISSION_IDS,
  hasIntermissionAfter,
  intermissionFrame,
  parseIntermissionParam,
  pickIntermission,
  type IntermissionFrame,
} from "./intermission";
import {
  BANANA_GRAB_HIT_MS,
  BANANA_GRAB_PEEL_X,
  BANANA_GRAB_PELLET_MS,
  BANANA_GRAB_PELLET_X,
} from "./intermissionBananaGrab";
import { BLINKY_CHASE_GAP_PX, BLINKY_CHASE_MS } from "./intermissionBlinkyChase";
import { INTERMISSION_ACTOR_SIZE, INTERMISSION_Y } from "./intermissionScript";
import { GHOST_DIR } from "./ghostPath";
import { PLAYFIELD_WIDTH } from "./playfieldBounds";

const HALF = INTERMISSION_ACTOR_SIZE / 2;

function actor(frame: IntermissionFrame, key: string) {
  return frame.actors.find((a) => a.key === key);
}

function durationOf(id: (typeof INTERMISSION_IDS)[number]): number {
  let ms = 0;
  while (!intermissionFrame(id, ms).done) {
    ms += 10;
  }
  return ms;
}

describe("intermission", () => {
  it("plays only after level 2", () => {
    expect([1, 2, 3, 9].map(hasIntermissionAfter)).toEqual([false, true, false, false]);
  });

  it("picks every registered intermission across the random range", () => {
    const picks = [0, 0.49, 0.5, 0.999].map((roll) => pickIntermission(() => roll));
    expect(new Set(picks)).toEqual(new Set(INTERMISSION_IDS));
    expect(INTERMISSION_IDS).toEqual(["blinkyChase", "bananaGrab"]);
  });

  it("parses ?intermission= ids only", () => {
    expect(parseIntermissionParam(new URLSearchParams("intermission=bananaGrab"))).toBe(
      "bananaGrab",
    );
    expect(parseIntermissionParam(new URLSearchParams("intermission=nope"))).toBeNull();
    expect(parseIntermissionParam(new URLSearchParams())).toBeNull();
  });

  it.each(INTERMISSION_IDS)("%s starts and ends with every actor off screen", (id) => {
    for (const frame of [intermissionFrame(id, 0), intermissionFrame(id, durationOf(id))]) {
      for (const a of frame.actors.filter((a) => a.kind === "dotMan" || a.kind === "ghost")) {
        expect(a.x < -HALF + 0.001 || a.x > PLAYFIELD_WIDTH + HALF - 0.001).toBe(true);
      }
    }
    expect(intermissionFrame(id, 0).done).toBe(false);
  });

  it("chases Dot-Man right with Blinky a fixed gap behind", () => {
    const a = intermissionFrame("blinkyChase", 1000);
    const b = intermissionFrame("blinkyChase", 2000);
    expect(actor(b, "blinky")!.x).toBeGreaterThan(actor(a, "blinky")!.x);
    expect(actor(a, "dotMan")!.x - actor(a, "blinky")!.x).toBe(BLINKY_CHASE_GAP_PX);
    expect(intermissionFrame("blinkyChase", BLINKY_CHASE_MS).done).toBe(true);
  });

  it("has a fast Clyde close on Dot-Man until he eats the power pellet", () => {
    const early = intermissionFrame("bananaGrab", 1300);
    const late = intermissionFrame("bananaGrab", BANANA_GRAB_PELLET_MS - 1);
    const gap = (f: IntermissionFrame) => actor(f, "dotMan")!.x - actor(f, "clyde")!.x;
    expect(gap(late)).toBeLessThan(gap(early));
    expect(late.beat).toBe("chase");
    expect(actor(late, "pellet")).toMatchObject({ kind: "powerPellet", x: BANANA_GRAB_PELLET_X });
    expect(actor(late, "peel")).toBeUndefined();
  });

  it("swaps the pellet for a banana peel between Clyde and Dot-Man", () => {
    const frame = intermissionFrame("bananaGrab", BANANA_GRAB_PELLET_MS);
    expect(frame.beat).toBe("peel");
    expect(actor(frame, "pellet")).toBeUndefined();
    expect(actor(frame, "dotMan")!.x).toBeCloseTo(BANANA_GRAB_PELLET_X);
    expect(actor(frame, "peel")).toMatchObject({ kind: "bananaPeel", x: BANANA_GRAB_PEEL_X });
    expect(actor(frame, "clyde")!.x).toBeLessThan(BANANA_GRAB_PEEL_X);
  });

  it("bounces Clyde back off the peel, then sends him off left while Dot-Man exits right", () => {
    const hit = intermissionFrame("bananaGrab", BANANA_GRAB_HIT_MS);
    const midBounce = intermissionFrame("bananaGrab", BANANA_GRAB_HIT_MS + 250);
    expect(midBounce.beat).toBe("bounce");
    expect(actor(midBounce, "clyde")!.x).toBeLessThan(actor(hit, "clyde")!.x);
    expect(actor(midBounce, "clyde")!.y).toBeLessThan(INTERMISSION_Y - 20);
    const exit = intermissionFrame("bananaGrab", BANANA_GRAB_HIT_MS + 1500);
    expect(exit.beat).toBe("exit");
    expect(actor(exit, "peel")).toBeUndefined();
    expect(actor(exit, "clyde")).toMatchObject({ facing: GHOST_DIR.left });
    const later = intermissionFrame("bananaGrab", BANANA_GRAB_HIT_MS + 1600);
    expect(actor(later, "clyde")!.x).toBeLessThan(actor(exit, "clyde")!.x);
    expect(actor(later, "dotMan")!.x).toBeGreaterThan(actor(exit, "dotMan")!.x);
  });
});
