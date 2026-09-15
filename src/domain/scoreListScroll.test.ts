import { describe, expect, it } from "vitest";
import {
  contentScrollExtent,
  createScoreListScroll,
  DEFAULT_SCORE_LIST_SCROLL,
  tickScoreListScroll,
} from "./scoreListScroll";

const config = DEFAULT_SCORE_LIST_SCROLL;

describe("contentScrollExtent", () => {
  it("includes trail rows so the bottom can scroll off", () => {
    const withoutTrail = 8 * config.rowHeight - config.viewportRows * config.rowHeight;
    const withTrail = contentScrollExtent(8, config);
    expect(withTrail).toBe(withoutTrail + config.trailRows * config.rowHeight);
    expect(withTrail).toBeGreaterThan(withoutTrail);
  });
});

describe("createScoreListScroll", () => {
  it("stays static when item count is at most five", () => {
    expect(createScoreListScroll(5, config)).toEqual({
      offsetY: 0,
      phase: "static",
      pauseRemainingMs: 0,
    });
  });

  it("starts paused when item count is more than five", () => {
    expect(createScoreListScroll(6, config)).toEqual({
      offsetY: 0,
      phase: "paused",
      pauseRemainingMs: config.pauseMs,
    });
  });
});

describe("tickScoreListScroll", () => {
  it("keeps offset at zero for five or fewer items", () => {
    let state = createScoreListScroll(5, config);
    state = tickScoreListScroll(state, 5, 5000, config);
    state = tickScoreListScroll(state, 5, 5000, config);
    expect(state).toEqual({ offsetY: 0, phase: "static", pauseRemainingMs: 0 });
  });

  it("remains paused until pauseMs elapses", () => {
    let state = createScoreListScroll(6, config);
    state = tickScoreListScroll(state, 6, 500, config);
    expect(state.phase).toBe("paused");
    expect(state.pauseRemainingMs).toBe(1000);
    expect(state.offsetY).toBe(0);

    state = tickScoreListScroll(state, 6, 1000, config);
    expect(state.phase).toBe("scrolling");
    expect(state.offsetY).toBe(0);
  });

  it("increases offset while scrolling", () => {
    let state = createScoreListScroll(6, config);
    state = tickScoreListScroll(state, 6, config.pauseMs, config);
    state = tickScoreListScroll(state, 6, 1000, config);
    expect(state.phase).toBe("scrolling");
    expect(state.offsetY).toBe(config.pixelsPerSecond);
  });

  it("loops to a top pause after scrolling past the extent", () => {
    let state = createScoreListScroll(6, config);
    state = tickScoreListScroll(state, 6, config.pauseMs, config);

    const extent = contentScrollExtent(6, config);
    const msToEnd = Math.ceil((extent / config.pixelsPerSecond) * 1000);
    state = tickScoreListScroll(state, 6, msToEnd, config);

    expect(state).toEqual({
      offsetY: 0,
      phase: "paused",
      pauseRemainingMs: config.pauseMs,
    });
  });
});
