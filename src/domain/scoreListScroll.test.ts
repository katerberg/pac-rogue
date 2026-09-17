import { describe, expect, it } from "vitest";
import {
  buildScoreListScrollConfig,
  contentScrollExtent,
  createScoreListScroll,
  DEFAULT_SCORE_LIST_SCROLL,
  fitScoreListViewportRows,
  tickScoreListScroll,
} from "./scoreListScroll";

const config = DEFAULT_SCORE_LIST_SCROLL;
const tallConfig = buildScoreListScrollConfig(11);

describe("fitScoreListViewportRows", () => {
  it("floors available height into whole rows", () => {
    expect(fitScoreListViewportRows(11 * config.rowHeight)).toBe(11);
    expect(fitScoreListViewportRows(11 * config.rowHeight + config.rowHeight - 1)).toBe(11);
  });

  it("returns at least one row", () => {
    expect(fitScoreListViewportRows(0)).toBe(1);
    expect(fitScoreListViewportRows(-10)).toBe(1);
  });
});

describe("buildScoreListScrollConfig", () => {
  it("sets scrollWhenMoreThan equal to viewportRows", () => {
    const built = buildScoreListScrollConfig(11);
    expect(built.viewportRows).toBe(11);
    expect(built.scrollWhenMoreThan).toBe(11);
    expect(built.rowHeight).toBe(config.rowHeight);
  });
});

describe("contentScrollExtent", () => {
  it("includes trail rows so the bottom can scroll off", () => {
    const withoutTrail = 8 * config.rowHeight - config.viewportRows * config.rowHeight;
    const withTrail = contentScrollExtent(8, config);
    expect(withTrail).toBe(withoutTrail + config.trailRows * config.rowHeight);
    expect(withTrail).toBeGreaterThan(withoutTrail);
  });
});

describe("createScoreListScroll", () => {
  it("stays static when item count is at most the viewport", () => {
    expect(createScoreListScroll(5, config)).toEqual({
      offsetY: 0,
      phase: "static",
      pauseRemainingMs: 0,
    });
    expect(createScoreListScroll(11, tallConfig)).toEqual({
      offsetY: 0,
      phase: "static",
      pauseRemainingMs: 0,
    });
  });

  it("starts paused when item count exceeds the viewport", () => {
    expect(createScoreListScroll(6, config)).toEqual({
      offsetY: 0,
      phase: "paused",
      pauseRemainingMs: config.pauseMs,
    });
    expect(createScoreListScroll(12, tallConfig)).toEqual({
      offsetY: 0,
      phase: "paused",
      pauseRemainingMs: tallConfig.pauseMs,
    });
  });
});

describe("tickScoreListScroll", () => {
  it("keeps offset at zero when item count fits the viewport", () => {
    let state = createScoreListScroll(11, tallConfig);
    state = tickScoreListScroll(state, 11, 5000, tallConfig);
    state = tickScoreListScroll(state, 11, 5000, tallConfig);
    expect(state).toEqual({ offsetY: 0, phase: "static", pauseRemainingMs: 0 });
  });

  it("remains paused until pauseMs elapses", () => {
    let state = createScoreListScroll(12, tallConfig);
    state = tickScoreListScroll(state, 12, 500, tallConfig);
    expect(state.phase).toBe("paused");
    expect(state.pauseRemainingMs).toBe(1000);
    expect(state.offsetY).toBe(0);

    state = tickScoreListScroll(state, 12, 1000, tallConfig);
    expect(state.phase).toBe("scrolling");
    expect(state.offsetY).toBe(0);
  });

  it("increases offset while scrolling", () => {
    let state = createScoreListScroll(12, tallConfig);
    state = tickScoreListScroll(state, 12, tallConfig.pauseMs, tallConfig);
    state = tickScoreListScroll(state, 12, 1000, tallConfig);
    expect(state.phase).toBe("scrolling");
    expect(state.offsetY).toBe(tallConfig.pixelsPerSecond);
  });

  it("loops to a top pause after scrolling past the extent", () => {
    let state = createScoreListScroll(12, tallConfig);
    state = tickScoreListScroll(state, 12, tallConfig.pauseMs, tallConfig);

    const extent = contentScrollExtent(12, tallConfig);
    const msToEnd = Math.ceil((extent / tallConfig.pixelsPerSecond) * 1000);
    state = tickScoreListScroll(state, 12, msToEnd, tallConfig);

    expect(state).toEqual({
      offsetY: 0,
      phase: "paused",
      pauseRemainingMs: tallConfig.pauseMs,
    });
  });
});
