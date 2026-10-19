import { describe, expect, it } from "vitest";
import { PLAYER_INVULN_TINT, PLAYER_PROGRAMMING_TINT, PLAYER_WALL_PASS_TINT } from "./playerTint";
import {
  REPLAY_LABEL_MS,
  REPLAY_MAX_SPEED,
  REPLAY_MIN_LOOP_MS,
  frameAt,
  itemsAt,
  replayCursor,
  replayPlayerTint,
  replaySpeed,
  type ReplayData,
  type ReplaySegment,
} from "./replay";

function segment(overrides: Partial<ReplaySegment> = {}): ReplaySegment {
  return {
    level: 1,
    tileSize: 16,
    maze: { walls: [], exterior: [], door: [] },
    items: [],
    frames: [],
    deaths: [],
    durationMs: 1000,
    ...overrides,
  };
}

describe("frameAt", () => {
  const frames = [
    {
      t: 0,
      mazeColorInverted: false,
      player: { x: 0, y: 0, angle: 0, tint: null },
      ghosts: [{ eid: 1, kind: 0, x: 0, y: 0, look: "normal" as const }],
    },
    {
      t: 100,
      mazeColorInverted: true,
      player: { x: 10, y: 0, angle: 0, tint: null },
      ghosts: [{ eid: 1, kind: 0, x: 20, y: 0, look: "normal" as const }],
    },
  ];

  it("interpolates midway between samples", () => {
    const view = frameAt(segment({ frames }), 50);
    expect(view.player?.x).toBeCloseTo(5);
    expect(view.ghosts[0]?.x).toBeCloseTo(10);
    expect(view.mazeColorInverted).toBe(false);
  });

  it("snaps instead of sliding across a jump larger than the snap distance", () => {
    const far = [
      frames[0]!,
      {
        t: 100,
        mazeColorInverted: false,
        player: { x: 200, y: 0, angle: 0, tint: null },
        ghosts: [{ eid: 2, kind: 0, x: 5, y: 0, look: "normal" as const }],
      },
    ];
    const view = frameAt(segment({ frames: far }), 50);
    expect(view.player?.x).toBe(0);
    expect(view.ghosts[0]).toEqual({ eid: 1, kind: 0, x: 0, y: 0, look: "normal" });
  });

  it("holds the last frame past the end and is empty without frames", () => {
    expect(frameAt(segment({ frames }), 999).player?.x).toBe(10);
    expect(frameAt(segment(), 0)).toEqual({ player: null, ghosts: [], mazeColorInverted: false });
  });
});

describe("itemsAt", () => {
  it("applies add and remove events up to the time", () => {
    const items = [
      { t: 0, op: "add" as const, eid: 1, art: "pellet", optional: false, x: 1, y: 1 },
      { t: 0, op: "add" as const, eid: 2, art: "power-pellet", optional: false, x: 2, y: 2 },
      { t: 50, op: "remove" as const, eid: 1, art: "pellet", optional: false, x: 1, y: 1 },
    ];
    expect(itemsAt(segment({ items }), 10).map((item) => item.eid)).toEqual([1, 2]);
    expect(itemsAt(segment({ items }), 50).map((item) => item.eid)).toEqual([2]);
  });
});

describe("replaySpeed", () => {
  const run = (durationMs: number): ReplayData => ({ segments: [segment({ durationMs })] });

  it("slows a short run so the loop lasts the minimum loop length", () => {
    const data = run(6000);
    const speed = replaySpeed(data);
    expect(speed).toBeLessThan(1);
    const loopMs = REPLAY_LABEL_MS + 6000 / speed;
    expect(loopMs).toBeCloseTo(REPLAY_MIN_LOOP_MS);
  });

  it("caps long runs at the maximum speed", () => {
    expect(replaySpeed(run(20 * 60_000))).toBe(REPLAY_MAX_SPEED);
  });

  it("is at the maximum when the labels alone fill the minimum loop", () => {
    const many: ReplayData = { segments: Array.from({ length: 60 }, () => segment()) };
    expect(replaySpeed(many)).toBeLessThanOrEqual(REPLAY_MAX_SPEED);
  });
});

describe("replayCursor", () => {
  const data: ReplayData = {
    segments: [segment({ durationMs: 60_000 }), segment({ level: 2, durationMs: 120_000 })],
  };
  const speed = replaySpeed(data);
  const firstLength = REPLAY_LABEL_MS + 60_000 / speed;
  const total = firstLength + REPLAY_LABEL_MS + 120_000 / speed;

  it("shows the label first, then plays at the computed speed", () => {
    expect(replayCursor(data, 0)).toMatchObject({ segmentIndex: 0, labelVisible: true });
    const playing = replayCursor(data, REPLAY_LABEL_MS + 10);
    expect(playing).toMatchObject({ segmentIndex: 0, labelVisible: false });
    expect(playing.simMs).toBeCloseTo(10 * speed);
  });

  it("loops no sooner than the minimum loop length", () => {
    expect(total).toBeGreaterThanOrEqual(REPLAY_MIN_LOOP_MS - 1);
  });

  it("moves to the next segment and loops back with a loop count", () => {
    expect(replayCursor(data, firstLength + 1)).toMatchObject({
      segmentIndex: 1,
      labelVisible: true,
    });
    expect(replayCursor(data, total + 1)).toMatchObject({
      segmentIndex: 0,
      labelVisible: true,
      loops: 1,
    });
  });

  it("is inert without segments", () => {
    expect(replayCursor({ segments: [] }, 5000)).toMatchObject({ simMs: 0, loops: 0 });
  });
});

describe("replayPlayerTint", () => {
  const base = { wallPass: false, programming: false, invulnRemainingMs: 0 };

  it("prefers wall pass, then programming, then invulnerability", () => {
    expect(replayPlayerTint({ ...base, invulnRemainingMs: 500 })).toBe(PLAYER_INVULN_TINT);
    expect(replayPlayerTint({ ...base, programming: true, invulnRemainingMs: 500 })).toBe(
      PLAYER_PROGRAMMING_TINT,
    );
    expect(replayPlayerTint({ ...base, wallPass: true, programming: true })).toBe(
      PLAYER_WALL_PASS_TINT,
    );
    expect(replayPlayerTint(base)).toBeNull();
  });
});
