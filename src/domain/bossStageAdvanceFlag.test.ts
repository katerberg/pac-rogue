import { describe, expect, it } from "vitest";
import { parseBossStageAdvanceFlag } from "./bossStageAdvanceFlag";

describe("parseBossStageAdvanceFlag", () => {
  it("is true only for bossStageAdvance=1", () => {
    expect(parseBossStageAdvanceFlag(new URLSearchParams("bossStageAdvance=1"))).toBe(true);
    expect(parseBossStageAdvanceFlag(new URLSearchParams("bossStageAdvance=true"))).toBe(false);
    expect(parseBossStageAdvanceFlag(new URLSearchParams("bossStageAdvance=0"))).toBe(false);
    expect(parseBossStageAdvanceFlag(new URLSearchParams())).toBe(false);
  });
});
