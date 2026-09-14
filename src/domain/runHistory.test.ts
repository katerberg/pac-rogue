import { describe, expect, it } from "vitest";
import {
  appendRun,
  emptyRunHistory,
  parseRunHistory,
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
      runs: [{ score: 9000, clearedAt: "2026-01-01T00:00:00.000Z" }],
    });
    expect(parseRunHistory(raw)).toEqual({
      version: RUN_HISTORY_VERSION,
      runs: [{ score: 9000, clearedAt: "2026-01-01T00:00:00.000Z" }],
    });
  });

  it("returns empty history for corrupt JSON", () => {
    expect(parseRunHistory("{not-json")).toEqual(emptyRunHistory());
  });

  it("returns empty history for wrong version or bad rows", () => {
    expect(parseRunHistory(JSON.stringify({ version: 2, runs: [] }))).toEqual(emptyRunHistory());
    expect(
      parseRunHistory(
        JSON.stringify({
          version: RUN_HISTORY_VERSION,
          runs: [{ score: "nope", clearedAt: "2026-01-01T00:00:00.000Z" }],
        }),
      ),
    ).toEqual(emptyRunHistory());
  });
});

describe("appendRun / serializeRunHistory", () => {
  it("appends newest runs at the end", () => {
    const first = appendRun(emptyRunHistory(), 100, "2026-01-01T00:00:00.000Z");
    const second = appendRun(first, 0, "2026-01-02T00:00:00.000Z");
    expect(second.runs).toEqual([
      { score: 100, clearedAt: "2026-01-01T00:00:00.000Z" },
      { score: 0, clearedAt: "2026-01-02T00:00:00.000Z" },
    ]);
    expect(parseRunHistory(serializeRunHistory(second))).toEqual(second);
  });
});
