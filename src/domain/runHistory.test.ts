import { describe, expect, it } from "vitest";
import {
  appendRun,
  emptyRunHistory,
  parseRunHistory,
  RUN_HISTORY_MAX_RUNS,
  RUN_HISTORY_VERSION,
  serializeRunHistory,
} from "./runHistory";

describe("parseRunHistory", () => {
  it("returns empty history for null or empty string", () => {
    expect(parseRunHistory(null)).toEqual(emptyRunHistory());
    expect(parseRunHistory("")).toEqual(emptyRunHistory());
  });

  it("parses a valid payload", () => {
    const raw = JSON.stringify({
      version: RUN_HISTORY_VERSION,
      runs: [
        {
          collectedCount: 42,
          remainingTime: 880,
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(parseRunHistory(raw)).toEqual({
      version: RUN_HISTORY_VERSION,
      runs: [
        {
          collectedCount: 42,
          remainingTime: 880,
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("returns empty history for corrupt JSON", () => {
    expect(parseRunHistory("{not-json")).toEqual(emptyRunHistory());
  });

  it("returns empty history for v1 payload or bad rows", () => {
    expect(
      parseRunHistory(
        JSON.stringify({
          version: 1,
          runs: [{ score: 9000, clearedAt: "2026-01-01T00:00:00.000Z" }],
        }),
      ),
    ).toEqual(emptyRunHistory());
    expect(
      parseRunHistory(
        JSON.stringify({
          version: RUN_HISTORY_VERSION,
          runs: [
            {
              collectedCount: "nope",
              remainingTime: 100,
              recordedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    ).toEqual(emptyRunHistory());
  });
});

describe("appendRun / serializeRunHistory", () => {
  it("appends newest runs at the end", () => {
    const first = appendRun(emptyRunHistory(), 10, 100, "2026-01-01T00:00:00.000Z");
    const second = appendRun(first, 0, 50, "2026-01-02T00:00:00.000Z");
    expect(second.runs).toEqual([
      { collectedCount: 10, remainingTime: 100, recordedAt: "2026-01-01T00:00:00.000Z" },
      { collectedCount: 0, remainingTime: 50, recordedAt: "2026-01-02T00:00:00.000Z" },
    ]);
    expect(parseRunHistory(serializeRunHistory(second))).toEqual(second);
  });

  it("drops oldest runs when append would overflow the cap", () => {
    let history = emptyRunHistory();
    for (let i = 0; i < RUN_HISTORY_MAX_RUNS + 3; i += 1) {
      history = appendRun(history, i, i, `2026-01-01T00:00:00.${String(i).padStart(3, "0")}Z`);
    }
    expect(history.runs).toHaveLength(RUN_HISTORY_MAX_RUNS);
    expect(history.runs[0]?.collectedCount).toBe(3);
    expect(history.runs.at(-1)?.collectedCount).toBe(RUN_HISTORY_MAX_RUNS + 2);
  });

  it("trims oversized payloads on parse", () => {
    const runs = Array.from({ length: RUN_HISTORY_MAX_RUNS + 5 }, (_, i) => ({
      collectedCount: i,
      remainingTime: i,
      recordedAt: `2026-01-01T00:00:00.${String(i).padStart(3, "0")}Z`,
    }));
    const parsed = parseRunHistory(JSON.stringify({ version: RUN_HISTORY_VERSION, runs }));
    expect(parsed.runs).toHaveLength(RUN_HISTORY_MAX_RUNS);
    expect(parsed.runs[0]?.collectedCount).toBe(5);
  });
});
