export type ScoreListScrollConfig = {
  scrollWhenMoreThan: number;
  pauseMs: number;
  pixelsPerSecond: number;
  rowHeight: number;
  viewportRows: number;
  trailRows: number;
};

export type ScoreListScrollState = {
  offsetY: number;
  phase: "static" | "paused" | "scrolling";
  pauseRemainingMs: number;
};

const ROW_HEIGHT = 28;
const PAUSE_MS = 1500;
const PIXELS_PER_SECOND = 40;
const TRAIL_ROWS = 3;

export function fitScoreListViewportRows(
  availableHeightPx: number,
  rowHeight = ROW_HEIGHT,
): number {
  return Math.max(1, Math.floor(availableHeightPx / Math.max(1, rowHeight)));
}

export function buildScoreListScrollConfig(viewportRows: number): ScoreListScrollConfig {
  const rows = Math.max(1, Math.floor(viewportRows));
  return {
    scrollWhenMoreThan: rows,
    pauseMs: PAUSE_MS,
    pixelsPerSecond: PIXELS_PER_SECOND,
    rowHeight: ROW_HEIGHT,
    viewportRows: rows,
    trailRows: TRAIL_ROWS,
  };
}

export const DEFAULT_SCORE_LIST_SCROLL: ScoreListScrollConfig = buildScoreListScrollConfig(5);

export function contentScrollExtent(itemCount: number, config: ScoreListScrollConfig): number {
  const contentHeight = itemCount * config.rowHeight + config.trailRows * config.rowHeight;
  const viewportHeight = config.viewportRows * config.rowHeight;
  return Math.max(0, contentHeight - viewportHeight);
}

export function createScoreListScroll(
  itemCount: number,
  config: ScoreListScrollConfig,
): ScoreListScrollState {
  if (itemCount <= config.scrollWhenMoreThan) {
    return { offsetY: 0, phase: "static", pauseRemainingMs: 0 };
  }
  return { offsetY: 0, phase: "paused", pauseRemainingMs: config.pauseMs };
}

export function tickScoreListScroll(
  state: ScoreListScrollState,
  itemCount: number,
  deltaMs: number,
  config: ScoreListScrollConfig,
): ScoreListScrollState {
  if (itemCount <= config.scrollWhenMoreThan) {
    return { offsetY: 0, phase: "static", pauseRemainingMs: 0 };
  }

  if (state.phase === "static") {
    return { offsetY: 0, phase: "paused", pauseRemainingMs: config.pauseMs };
  }

  const safeDelta = Math.max(0, deltaMs);

  if (state.phase === "paused") {
    const remaining = state.pauseRemainingMs - safeDelta;
    if (remaining > 0) {
      return { ...state, pauseRemainingMs: remaining };
    }
    return { offsetY: state.offsetY, phase: "scrolling", pauseRemainingMs: 0 };
  }

  const extent = contentScrollExtent(itemCount, config);
  const offsetY = state.offsetY + config.pixelsPerSecond * (safeDelta / 1000);
  if (offsetY >= extent) {
    return { offsetY: 0, phase: "paused", pauseRemainingMs: config.pauseMs };
  }
  return { offsetY, phase: "scrolling", pauseRemainingMs: 0 };
}
