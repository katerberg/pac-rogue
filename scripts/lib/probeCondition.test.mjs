import { describe, expect, it } from "vitest";
import { checkCondition, parseCondition, readPath } from "./probeCondition.mjs";

const snapshot = {
  scenes: { PlayScene: "running" },
  play: {
    lives: 3,
    inStore: false,
    boss: null,
    layout: "mazeSmall",
    ghosts: [{ phase: "inHouse" }],
  },
};

describe("parseCondition", () => {
  it("parses numbers, booleans, null and strings", () => {
    expect(parseCondition("play.lives>=3")).toMatchObject({
      path: "play.lives",
      op: ">=",
      expected: 3,
    });
    expect(parseCondition("play.inStore==false").expected).toBe(false);
    expect(parseCondition("play.boss==null").expected).toBeNull();
    expect(parseCondition("play.layout==mazeSmall").expected).toBe("mazeSmall");
  });

  it("rejects text without an operator", () => {
    expect(() => parseCondition("play.lives")).toThrow(/Bad condition/);
  });
});

describe("readPath", () => {
  it("walks objects, array indexes and length", () => {
    expect(readPath(snapshot, "play.ghosts.0.phase")).toBe("inHouse");
    expect(readPath(snapshot, "play.ghosts.length")).toBe(1);
    expect(readPath(snapshot, "play.boss.ghostCount")).toBeUndefined();
  });
});

describe("checkCondition", () => {
  it("reports the actual value", () => {
    expect(checkCondition(snapshot, parseCondition("play.lives==2"))).toEqual({
      ok: false,
      actual: 3,
    });
    expect(checkCondition(snapshot, parseCondition("play.lives>2"))).toEqual({
      ok: true,
      actual: 3,
    });
    expect(checkCondition(snapshot, parseCondition("scenes.PlayScene==running")).ok).toBe(true);
  });

  it("fails numeric comparisons on missing values", () => {
    expect(checkCondition(snapshot, parseCondition("play.boss.ghostCount>=0")).ok).toBe(false);
  });
});
