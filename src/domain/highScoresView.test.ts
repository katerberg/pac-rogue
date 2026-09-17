import { describe, expect, it } from "vitest";
import { RUN_HISTORY_VERSION } from "./runHistory";
import {
  dateLabelFromRecordedAt,
  formatHighScoreHeader,
  formatHighScoreLine,
  HIGH_SCORE_COLUMN_GAP,
  HIGH_SCORE_DATE_WIDTH,
  HIGH_SCORE_PELLETS_WIDTH,
  HIGH_SCORE_TIME_WIDTH,
  toHighScoreRows,
} from "./highScoresView";

describe("dateLabelFromRecordedAt", () => {
  it("uses the YYYY-MM-DD prefix from ISO timestamps", () => {
    expect(dateLabelFromRecordedAt("2026-03-15T12:34:56.000Z")).toBe("2026-03-15");
  });

  it("falls back when the prefix is missing", () => {
    expect(dateLabelFromRecordedAt("not-a-date")).toBe("????-??-??");
  });
});

describe("toHighScoreRows", () => {
  it("returns an empty list for empty history", () => {
    expect(toHighScoreRows({ version: RUN_HISTORY_VERSION, runs: [] })).toEqual([]);
  });

  it("sorts by collected descending, then remainingTime descending, then newer recordedAt", () => {
    const rows = toHighScoreRows({
      version: RUN_HISTORY_VERSION,
      runs: [
        {
          collectedCount: 10,
          remainingTime: 100,
          recordedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          collectedCount: 30,
          remainingTime: 50,
          recordedAt: "2026-01-02T00:00:00.000Z",
        },
        {
          collectedCount: 20,
          remainingTime: 200,
          recordedAt: "2026-01-03T00:00:00.000Z",
        },
        {
          collectedCount: 20,
          remainingTime: 300,
          recordedAt: "2026-01-04T00:00:00.000Z",
        },
        {
          collectedCount: 20,
          remainingTime: 300,
          recordedAt: "2026-01-05T00:00:00.000Z",
        },
      ],
    });
    expect(
      rows.map((row) => ({
        collectedCount: row.collectedCount,
        remainingTime: row.remainingTime,
        recordedAt: row.recordedAt,
      })),
    ).toEqual([
      {
        collectedCount: 30,
        remainingTime: 50,
        recordedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        collectedCount: 20,
        remainingTime: 300,
        recordedAt: "2026-01-05T00:00:00.000Z",
      },
      {
        collectedCount: 20,
        remainingTime: 300,
        recordedAt: "2026-01-04T00:00:00.000Z",
      },
      {
        collectedCount: 20,
        remainingTime: 200,
        recordedAt: "2026-01-03T00:00:00.000Z",
      },
      {
        collectedCount: 10,
        remainingTime: 100,
        recordedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("formatHighScoreHeader / formatHighScoreLine", () => {
  it("uses one fixed-width template so header and rows share columns", () => {
    const header = formatHighScoreHeader();
    const line = formatHighScoreLine({
      collectedCount: 42,
      remainingTime: 880,
      dateLabel: "2026-01-01",
      recordedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(header).toBe("PELLETS  TIME  DATE      ");
    expect(line).toBe("     42   880  2026-01-01");
    expect(header.length).toBe(line.length);
    expect(header.length).toBe(
      HIGH_SCORE_PELLETS_WIDTH +
        HIGH_SCORE_COLUMN_GAP.length +
        HIGH_SCORE_TIME_WIDTH +
        HIGH_SCORE_COLUMN_GAP.length +
        HIGH_SCORE_DATE_WIDTH,
    );
    expect(header.indexOf("DATE")).toBe(line.indexOf("2026"));
  });
});
