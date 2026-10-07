import { describe, expect, it } from "vitest";
import { RUN_HISTORY_VERSION } from "./runHistory";
import {
  dateLabelFromRecordedAt,
  HIGH_SCORE_COLUMN_GAP,
  highScoreCellX,
  layoutHighScoreColumns,
  toHighScoreRows,
  type HighScoreRow,
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

function proportionalMeasure(text: string): number {
  let total = 0;
  for (const ch of text) {
    total += ch === "1" || ch === " " ? 1 : 2;
  }
  return total;
}

function monospaceMeasure(text: string): number {
  return text.length;
}

const SAMPLE_ROWS: HighScoreRow[] = [
  {
    collectedCount: 9999,
    remainingTime: 1,
    dateLabel: "2026-04-04",
    recordedAt: "2026-04-04T00:00:00.000Z",
  },
  {
    collectedCount: 1,
    remainingTime: 880,
    dateLabel: "2026-01-01",
    recordedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("layoutHighScoreColumns", () => {
  it("keeps every row's cells on the same column edges under a proportional measure", () => {
    const layout = layoutHighScoreColumns(proportionalMeasure, SAMPLE_ROWS);
    const listLeftX = 100;
    const timeXs = SAMPLE_ROWS.map(() => highScoreCellX(layout, "time", "right", listLeftX));
    expect(new Set(timeXs).size).toBe(1);
    expect(highScoreCellX(layout, "pellets", "right", listLeftX)).toBe(
      listLeftX + layout.left.pellets + layout.width.pellets,
    );
    expect(highScoreCellX(layout, "date", "left", listLeftX)).toBe(listLeftX + layout.left.date);
    expect(highScoreCellX(layout, "time", "left", listLeftX)).toBe(listLeftX + layout.left.time);

    const paddedStarts = SAMPLE_ROWS.map((row) => {
      const pellets = String(row.collectedCount).padStart(7);
      const time = String(row.remainingTime).padStart(4);
      return proportionalMeasure(`${pellets}${HIGH_SCORE_COLUMN_GAP}${time}`);
    });
    expect(new Set(paddedStarts).size).toBeGreaterThan(1);
  });

  it("packs columns with the measured gap and matches monospace pad widths", () => {
    const layout = layoutHighScoreColumns(monospaceMeasure, SAMPLE_ROWS);
    expect(layout.gap).toBe(HIGH_SCORE_COLUMN_GAP.length);
    expect(layout.width.pellets).toBe("PELLETS".length);
    expect(layout.width.time).toBe(Math.max("TIME".length, 3));
    expect(layout.width.date).toBe("2026-04-04".length);
    expect(layout.totalWidth).toBe(
      layout.width.pellets + layout.gap + layout.width.time + layout.gap + layout.width.date,
    );
    expect(layout.left.time).toBe(layout.width.pellets + layout.gap);
    expect(layout.left.date).toBe(
      layout.width.pellets + layout.gap + layout.width.time + layout.gap,
    );
  });
});
