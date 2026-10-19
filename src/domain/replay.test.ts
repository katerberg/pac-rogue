import { describe, expect, it } from "vitest";
import {
  REPLAY_LABEL_MS,
  REPLAY_SPEED,
  frameAt,
  itemsAt,
  replayCursor,
  type ReplayData,
  type ReplaySegment,
} from "./replay";

function segment(overrides: Partial<ReplaySegment> = {}): ReplaySegment {
  return {
    level: 1,
    tileSize: 16,
    walls: [],
    items: [],
    frames: [],
    deaths: [],
    durationMs: 1000,
    ...overrides,
  };
}

describe("frameAt", () => {
  const frames = [
    { t: 0, player: { x: 0, y: 0, angle: 0 }, ghosts: [{ eid: 1, kind: 0, x: 0, y: 0 }] },
    { t: 100, player: { x: 10, y: 0, angle: 0 }, ghosts: [{ eid: 1, kind: 0, x: 20, y: 0 }] },
  ];

  it("interpolates midway between samples", () => {
    const view = frameAt(segment({ frames }), 50);
    expect(view.player?.x).toBeCloseTo(5);
    expect(view.ghosts[0]?.x).toBeCloseTo(10);
  });

  it("snaps instead of sliding across a jump larger than the snap distance", () => {
    const far = [
      frames[0]!,
      { t: 100, player: { x: 200, y: 0, angle: 0 }, ghosts: [{ eid: 2, kind: 0, x: 5, y: 0 }] },
    ];
    const view = frameAt(segment({ frames: far }), 50);
    expect(view.player?.x).toBe(0);
    expect(view.ghosts[0]).toEqual({ eid: 1, kind: 0, x: 0, y: 0 });
  });

  it("holds the last frame past the end and is empty without frames", () => {
    expect(frameAt(segment({ frames }), 999).player?.x).toBe(10);
    expect(frameAt(segment(), 0)).toEqual({ player: null, ghosts: [] });
  });
});

describe("itemsAt", () => {
  it("applies add and remove events up to the time", () => {
    const items = [
      { t: 0, op: "add" as const, eid: 1, kind: "pellet" as const, x: 1, y: 1 },
      { t: 0, op: "add" as const, eid: 2, kind: "power" as const, x: 2, y: 2 },
      { t: 50, op: "remove" as const, eid: 1, kind: "pellet" as const, x: 1, y: 1 },
    ];
    expect(itemsAt(segment({ items }), 10).map((item) => item.eid)).toEqual([1, 2]);
    expect(itemsAt(segment({ items }), 50).map((item) => item.eid)).toEqual([2]);
  });
});

describe("replayCursor", () => {
  const data: ReplayData = {
    segments: [segment({ durationMs: 2000 }), segment({ level: 2, durationMs: 4000 })],
  };
  const firstLength = REPLAY_LABEL_MS + 2000 / REPLAY_SPEED;
  const total = firstLength + REPLAY_LABEL_MS + 4000 / REPLAY_SPEED;

  it("shows the label first, then plays at replay speed", () => {
    expect(replayCursor(data, 0)).toMatchObject({ segmentIndex: 0, labelVisible: true });
    const playing = replayCursor(data, REPLAY_LABEL_MS + 10);
    expect(playing).toMatchObject({ segmentIndex: 0, labelVisible: false });
    expect(playing.simMs).toBeCloseTo(10 * REPLAY_SPEED);
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
