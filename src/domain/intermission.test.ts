import { describe, expect, it } from "vitest";
import {
  INTERMISSION_IDS,
  hasIntermissionAfter,
  intermissionFrame,
  parseIntermissionParam,
  pickIntermission,
  type IntermissionFrame,
} from "./intermission";
import { BANANA_GRAB_HIT_MS, BANANA_GRAB_PEEL_X } from "./intermissionBananaGrab";
import { BLINKY_CHASE_GAP_PX, BLINKY_CHASE_MS } from "./intermissionBlinkyChase";
import { DEFY_DEATH_CATCH_MS } from "./intermissionDefyDeath";
import { FREEZE_THAW_MS } from "./intermissionFreeze";
import { GHOST_PASS_MEET_MS } from "./intermissionGhostPass";
import { SCATTER_BURST_GONE_MS } from "./intermissionScatterBurst";
import {
  INTERMISSION_ACTOR_SIZE,
  INTERMISSION_PELLET_MS,
  INTERMISSION_PELLET_X,
  INTERMISSION_Y,
} from "./intermissionScript";
import { SHIELD_BOUNCE_HIT_MS } from "./intermissionShieldBounce";
import { SPEED_BURST_TURN_MS } from "./intermissionSpeedBurst";
import { GHOST_DIR } from "./ghostPath";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "./playfieldBounds";
import { PLAYER_INVULN_TINT } from "./playerTint";

const HALF = INTERMISSION_ACTOR_SIZE / 2;

type AnyActor = IntermissionFrame["actors"][number] & { size?: number; look?: string };

function actor(frame: IntermissionFrame, key: string): AnyActor | undefined {
  return frame.actors.find((a) => a.key === key);
}

function beatsOf(id: (typeof INTERMISSION_IDS)[number]): string[] {
  const beats: string[] = [];
  for (let ms = 0; ms <= durationOf(id); ms += 10) {
    const { beat } = intermissionFrame(id, ms);
    if (beats.at(-1) !== beat) {
      beats.push(beat);
    }
  }
  return beats;
}

function beatsStart(id: (typeof INTERMISSION_IDS)[number], beat: string): number {
  let ms = 0;
  while (intermissionFrame(id, ms).beat !== beat) {
    ms += 10;
  }
  return ms;
}

function offScreen(a: { x: number; y: number }, slackPx = 0.001): boolean {
  return (
    a.x <= -HALF + slackPx ||
    a.x >= PLAYFIELD_WIDTH + HALF - slackPx ||
    a.y <= -HALF + slackPx ||
    a.y >= PLAYFIELD_HEIGHT + HALF - slackPx
  );
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
    const n = INTERMISSION_IDS.length;
    const picks = INTERMISSION_IDS.map((_, i) => pickIntermission(() => (i + 0.5) / n));
    expect(picks).toEqual(INTERMISSION_IDS);
    expect(pickIntermission(() => 0.9999)).toBe(INTERMISSION_IDS.at(-1));
    expect(INTERMISSION_IDS).toEqual([
      "blinkyChase",
      "bananaGrab",
      "shieldBounce",
      "ghostPass",
      "speedBurst",
      "freeze",
      "scatterBurst",
      "defyDeath",
    ]);
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
        expect(offScreen(a), `${id} ${a.key}`).toBe(true);
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
    const late = intermissionFrame("bananaGrab", INTERMISSION_PELLET_MS - 1);
    const gap = (f: IntermissionFrame) => actor(f, "dotMan")!.x - actor(f, "clyde")!.x;
    expect(gap(late)).toBeLessThan(gap(early));
    expect(late.beat).toBe("chase");
    expect(actor(late, "pellet")).toMatchObject({ kind: "powerPellet", x: INTERMISSION_PELLET_X });
    expect(actor(late, "peel")).toBeUndefined();
  });

  it("swaps the pellet for a banana peel between Clyde and Dot-Man", () => {
    const frame = intermissionFrame("bananaGrab", INTERMISSION_PELLET_MS);
    expect(frame.beat).toBe("peel");
    expect(actor(frame, "pellet")).toBeUndefined();
    expect(actor(frame, "dotMan")!.x).toBeCloseTo(INTERMISSION_PELLET_X);
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

  it.each(INTERMISSION_IDS.filter((id) => id !== "blinkyChase"))(
    "%s eats the pellet at the shared beat, then ends in an exit beat",
    (id) => {
      expect(actor(intermissionFrame(id, INTERMISSION_PELLET_MS - 1), "pellet")).toBeDefined();
      expect(actor(intermissionFrame(id, INTERMISSION_PELLET_MS), "pellet")).toBeUndefined();
      const beats = beatsOf(id);
      expect(beats[0]).toBe("chase");
      expect(beats.at(-1)).toBe("exit");
      expect(new Set(beats).size).toBe(beats.length);
    },
  );

  it("shields Dot-Man at the pellet, bounces Pinky off the bubble, then splits them up", () => {
    const shielded = intermissionFrame("shieldBounce", SHIELD_BOUNCE_HIT_MS - 1);
    expect(shielded.beat).toBe("shield");
    expect(actor(shielded, "shield")).toMatchObject({
      kind: "bubbleShield",
      x: actor(shielded, "dotMan")!.x,
    });
    const hit = intermissionFrame("shieldBounce", SHIELD_BOUNCE_HIT_MS);
    const midBounce = intermissionFrame("shieldBounce", SHIELD_BOUNCE_HIT_MS + 275);
    expect(actor(hit, "shield")).toBeUndefined();
    expect(midBounce.beat).toBe("bounce");
    expect(actor(midBounce, "pinky")!.x).toBeLessThan(actor(hit, "pinky")!.x);
    expect(actor(midBounce, "pinky")!.y).toBeLessThan(INTERMISSION_Y - 20);
    const a = intermissionFrame("shieldBounce", SHIELD_BOUNCE_HIT_MS + 900);
    const b = intermissionFrame("shieldBounce", SHIELD_BOUNCE_HIT_MS + 1000);
    expect(a.beat).toBe("exit");
    expect(actor(b, "pinky")!.x).toBeLessThan(actor(a, "pinky")!.x);
    expect(actor(b, "dotMan")!.x).toBeGreaterThan(actor(a, "dotMan")!.x);
  });

  it("turns Dot-Man ghost-proof so he walks back through Inky", () => {
    const before = intermissionFrame("ghostPass", GHOST_PASS_MEET_MS - 200);
    const after = intermissionFrame("ghostPass", GHOST_PASS_MEET_MS + 200);
    expect(actor(before, "dotMan")).toMatchObject({ flipX: true, tint: PLAYER_INVULN_TINT });
    expect(actor(before, "dotMan")!.alpha).toBeLessThan(1);
    expect(actor(before, "dotMan")!.x).toBeGreaterThan(actor(before, "inky")!.x);
    expect(actor(after, "dotMan")!.x).toBeLessThan(actor(after, "inky")!.x);
    expect(actor(after, "dotMan")!.x).toBeLessThan(actor(before, "dotMan")!.x);
    expect(actor(after, "inky")!.x).toBeGreaterThan(actor(before, "inky")!.x);
    expect(intermissionFrame("ghostPass", INTERMISSION_PELLET_MS - 1).actors).not.toContainEqual(
      expect.objectContaining({ tint: PLAYER_INVULN_TINT }),
    );
  });

  it("dashes Dot-Man away with fading afterimages while Blinky brakes, stares, then leaves", () => {
    const chaseStep =
      actor(intermissionFrame("speedBurst", 1100), "dotMan")!.x -
      actor(intermissionFrame("speedBurst", 1000), "dotMan")!.x;
    const dashStep =
      actor(intermissionFrame("speedBurst", INTERMISSION_PELLET_MS + 200), "dotMan")!.x -
      actor(intermissionFrame("speedBurst", INTERMISSION_PELLET_MS + 100), "dotMan")!.x;
    expect(dashStep).toBeGreaterThan(chaseStep * 3);
    const dash = intermissionFrame("speedBurst", INTERMISSION_PELLET_MS + 200);
    const trails = dash.actors.filter((a) => a.key.startsWith("trail"));
    expect(trails.map((a) => a.alpha)).toEqual([0.45, 0.3, 0.15]);
    expect(trails.every((a) => a.x < actor(dash, "dotMan")!.x)).toBe(true);
    const stareA = intermissionFrame("speedBurst", SPEED_BURST_TURN_MS - 300);
    const stareB = intermissionFrame("speedBurst", SPEED_BURST_TURN_MS - 1);
    expect(stareA.beat).toBe("huh");
    expect(actor(stareB, "blinky")!.x).toBe(actor(stareA, "blinky")!.x);
    expect(actor(stareB, "blinky")).toMatchObject({ facing: GHOST_DIR.up });
    const leaving = intermissionFrame("speedBurst", SPEED_BURST_TURN_MS + 100);
    expect(actor(leaving, "blinky")).toMatchObject({ facing: GHOST_DIR.left });
    expect(actor(leaving, "blinky")!.x).toBeLessThan(actor(stareB, "blinky")!.x);
  });

  it("freezes Clyde in place while Dot-Man runs off, then thaws him to leave the other way", () => {
    const a = intermissionFrame("freeze", INTERMISSION_PELLET_MS + 100);
    const b = intermissionFrame("freeze", FREEZE_THAW_MS - 1);
    expect(actor(a, "clyde")).toMatchObject({ look: "frozen", y: INTERMISSION_Y });
    expect(actor(b, "clyde")!.x).toBe(actor(a, "clyde")!.x);
    expect(actor(b, "dotMan")!.x).toBeGreaterThan(actor(a, "dotMan")!.x);
    const thawed = intermissionFrame("freeze", FREEZE_THAW_MS + 200);
    expect(actor(thawed, "clyde")!.look).toBeUndefined();
    expect(actor(thawed, "clyde")).toMatchObject({ facing: GHOST_DIR.left });
    expect(actor(thawed, "clyde")!.x).toBeLessThan(actor(b, "clyde")!.x);
  });

  it("flings the whole pack off screen in four directions while Dot-Man walks on", () => {
    const keys = ["blinky", "pinky", "inky", "clyde"];
    const chase = intermissionFrame("scatterBurst", INTERMISSION_PELLET_MS - 1);
    expect(keys.every((key) => actor(chase, key) !== undefined)).toBe(true);
    const flung = intermissionFrame("scatterBurst", INTERMISSION_PELLET_MS + 200);
    const quadrants = keys.map((key) => {
      const from = actor(chase, key)!;
      const to = actor(flung, key)!;
      return `${Math.sign(to.x - from.x)},${Math.sign(to.y - from.y)}`;
    });
    expect(new Set(quadrants).size).toBe(4);
    const gone = intermissionFrame("scatterBurst", SCATTER_BURST_GONE_MS);
    expect(gone.beat).toBe("exit");
    expect(gone.actors.map((a) => a.key)).toEqual(["dotMan"]);
    const last = intermissionFrame("scatterBurst", SCATTER_BURST_GONE_MS - 1);
    const lastGhosts = last.actors.filter((a) => a.kind === "ghost");
    expect(lastGhosts.length).toBeGreaterThan(0);
    expect(lastGhosts.every((a) => offScreen(a, 2))).toBe(true);
  });

  it("lets Blinky catch Dot-Man, who revives behind him and walks off the other way", () => {
    expect(actor(intermissionFrame("defyDeath", DEFY_DEATH_CATCH_MS - 1), "dotMan")).toBeDefined();
    const caught = intermissionFrame("defyDeath", DEFY_DEATH_CATCH_MS + 100);
    expect(caught.beat).toBe("caught");
    expect(actor(caught, "dotMan")).toBeUndefined();
    const reviving = intermissionFrame("defyDeath", beatsStart("defyDeath", "revive") + 100);
    const revived = actor(reviving, "dotMan")!;
    expect(revived.size).toBeGreaterThan(INTERMISSION_ACTOR_SIZE);
    expect(revived.alpha).toBeLessThan(1);
    expect(revived.x).toBeLessThan(actor(reviving, "blinky")!.x);
    const a = intermissionFrame("defyDeath", beatsStart("defyDeath", "exit") + 100);
    const b = intermissionFrame("defyDeath", beatsStart("defyDeath", "exit") + 200);
    expect(actor(b, "dotMan")).toMatchObject({ flipX: true });
    expect(actor(b, "dotMan")!.x).toBeLessThan(actor(a, "dotMan")!.x);
  });
});
