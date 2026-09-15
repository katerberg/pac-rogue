import { describe, expect, it } from "vitest";
import { RUN_HISTORY_VERSION } from "./runHistory";
import {
  dateLabelFromClearedAt,
  formatHighScoreHeader,
  formatHighScoreLine,
  HIGH_SCORE_DATE_WIDTH,
  HIGH_SCORE_TIME_WIDTH,
  toHighScoreRows,
} from "./highScoresView";

describe("dateLabelFromClearedAt", () => {
  it("uses the YYYY-MM-DD prefix from ISO timestamps", () => {
    expect(dateLabelFromClearedAt("2026-03-15T12:34:56.000Z")).toBe("2026-03-15");
  });

  it("falls back when the prefix is missing", () => {
    expect(dateLabelFromClearedAt("not-a-date")).toBe("????-??-??");
  });
});

describe("toHighScoreRows", () => {
  it("returns an empty list for empty history", () => {
    expect(toHighScoreRows({ version: RUN_HISTORY_VERSION, runs: [] })).toEqual([]);
  });

  it("sorts by score descending and newer clearedAt on ties", () => {
    const rows = toHighScoreRows({
      version: RUN_HISTORY_VERSION,
      runs: [
        { score: 100, clearedAt: "2026-01-01T00:00:00.000Z" },
        { score: 300, clearedAt: "2026-01-02T00:00:00.000Z" },
        { score: 200, clearedAt: "2026-01-03T00:00:00.000Z" },
        { score: 200, clearedAt: "2026-01-04T00:00:00.000Z" },
      ],
    });
    expect(rows.map((row) => ({ score: row.score, clearedAt: row.clearedAt }))).toEqual([
      { score: 300, clearedAt: "2026-01-02T00:00:00.000Z" },
      { score: 200, clearedAt: "2026-01-04T00:00:00.000Z" },
      { score: 200, clearedAt: "2026-01-03T00:00:00.000Z" },
      { score: 100, clearedAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });
});

describe("formatHighScoreHeader / formatHighScoreLine", () => {
  it("uses one fixed-width template so header and rows share columns", () => {
    const header = formatHighScoreHeader();
    const line = formatHighScoreLine({
      score: 880,
      dateLabel: "2026-01-01",
      clearedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(header).toBe("TIME  DATE      ");
    expect(line).toBe(" 880  2026-01-01");
    expect(header.length).toBe(line.length);
    expect(header.length).toBe(HIGH_SCORE_TIME_WIDTH + 2 + HIGH_SCORE_DATE_WIDTH);
    expect(header.indexOf("DATE")).toBe(line.indexOf("2026"));
  });
});
