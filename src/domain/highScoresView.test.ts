import { describe, expect, it } from "vitest";
import { RUN_HISTORY_VERSION } from "./runHistory";
import {
  dateLabelFromClearedAt,
  formatHighScoreLine,
  HIGH_SCORE_COLUMN_HEADER,
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

describe("formatHighScoreLine", () => {
  it("joins padded time and date label under the column header", () => {
    expect(HIGH_SCORE_COLUMN_HEADER).toBe("TIME  DATE");
    expect(
      formatHighScoreLine({
        score: 880,
        dateLabel: "2026-01-01",
        clearedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(" 880  2026-01-01");
  });
});
