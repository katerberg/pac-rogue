import type { RunHistory } from "./runHistory";

export type HighScoreRow = {
  collectedCount: number;
  remainingTime: number;
  dateLabel: string;
  recordedAt: string;
};

export type HighScoreAlign = "left" | "right";

export type HighScoreColumnId = "pellets" | "time" | "date";

export type HighScoreColumn = {
  id: HighScoreColumnId;
  header: string;
  align: HighScoreAlign;
  text: (row: HighScoreRow) => string;
};

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

export const HIGH_SCORE_COLUMN_GAP = "  ";

export const HIGH_SCORE_COLUMNS: readonly HighScoreColumn[] = [
  {
    id: "pellets",
    header: "PELLETS",
    align: "right",
    text: (row) => String(row.collectedCount),
  },
  {
    id: "time",
    header: "TIME",
    align: "right",
    text: (row) => String(row.remainingTime),
  },
  {
    id: "date",
    header: "DATE",
    align: "left",
    text: (row) => row.dateLabel,
  },
];

export type HighScoreColumnLayout = {
  left: Record<HighScoreColumnId, number>;
  width: Record<HighScoreColumnId, number>;
  totalWidth: number;
  gap: number;
};

export function dateLabelFromRecordedAt(recordedAt: string): string {
  const match = ISO_DATE_PREFIX.exec(recordedAt);
  if (match === null) {
    return "????-??-??";
  }
  return match[0];
}

export function toHighScoreRows(history: RunHistory): HighScoreRow[] {
  return history.runs
    .map((run) => ({
      collectedCount: run.collectedCount,
      remainingTime: run.remainingTime,
      recordedAt: run.recordedAt,
      dateLabel: dateLabelFromRecordedAt(run.recordedAt),
    }))
    .sort((a, b) => {
      if (b.collectedCount !== a.collectedCount) {
        return b.collectedCount - a.collectedCount;
      }
      if (b.remainingTime !== a.remainingTime) {
        return b.remainingTime - a.remainingTime;
      }
      return b.recordedAt.localeCompare(a.recordedAt);
    });
}

export function layoutHighScoreColumns(
  measure: (text: string) => number,
  rows: readonly HighScoreRow[],
): HighScoreColumnLayout {
  const gap = measure(HIGH_SCORE_COLUMN_GAP);
  const left = {} as Record<HighScoreColumnId, number>;
  const width = {} as Record<HighScoreColumnId, number>;
  let x = 0;
  for (const column of HIGH_SCORE_COLUMNS) {
    let w = measure(column.header);
    for (const row of rows) {
      w = Math.max(w, measure(column.text(row)));
    }
    left[column.id] = x;
    width[column.id] = w;
    x += w + gap;
  }
  return {
    left,
    width,
    totalWidth: Math.max(0, x - gap),
    gap,
  };
}

export function highScoreCellX(
  layout: HighScoreColumnLayout,
  columnId: HighScoreColumnId,
  align: HighScoreAlign,
  listLeftX: number,
): number {
  const colLeft = listLeftX + layout.left[columnId];
  if (align === "right") {
    return colLeft + layout.width[columnId];
  }
  return colLeft;
}
