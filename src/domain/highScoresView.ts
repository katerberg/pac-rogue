import type { RunHistory } from "./runHistory";

export type HighScoreRow = {
  collectedCount: number;
  remainingTime: number;
  dateLabel: string;
  recordedAt: string;
};

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

export const HIGH_SCORE_PELLETS_WIDTH = 7;
export const HIGH_SCORE_TIME_WIDTH = 4;
export const HIGH_SCORE_DATE_WIDTH = 10;
export const HIGH_SCORE_COLUMN_GAP = "  ";

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

export function formatHighScoreHeader(): string {
  return `${"PELLETS".padEnd(HIGH_SCORE_PELLETS_WIDTH)}${HIGH_SCORE_COLUMN_GAP}${"TIME".padEnd(HIGH_SCORE_TIME_WIDTH)}${HIGH_SCORE_COLUMN_GAP}${"DATE".padEnd(HIGH_SCORE_DATE_WIDTH)}`;
}

export function formatHighScoreLine(row: HighScoreRow): string {
  return `${String(row.collectedCount).padStart(HIGH_SCORE_PELLETS_WIDTH)}${HIGH_SCORE_COLUMN_GAP}${String(row.remainingTime).padStart(HIGH_SCORE_TIME_WIDTH)}${HIGH_SCORE_COLUMN_GAP}${row.dateLabel.padEnd(HIGH_SCORE_DATE_WIDTH)}`;
}
