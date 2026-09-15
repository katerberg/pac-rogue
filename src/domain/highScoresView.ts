import type { RunHistory } from "./runHistory";

export type HighScoreRow = {
  score: number;
  dateLabel: string;
  clearedAt: string;
};

const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/;

export const HIGH_SCORE_TIME_WIDTH = 4;
export const HIGH_SCORE_DATE_WIDTH = 10;
export const HIGH_SCORE_COLUMN_GAP = "  ";

export function dateLabelFromClearedAt(clearedAt: string): string {
  const match = ISO_DATE_PREFIX.exec(clearedAt);
  if (match === null) {
    return "????-??-??";
  }
  return match[0];
}

export function toHighScoreRows(history: RunHistory): HighScoreRow[] {
  return history.runs
    .map((run) => ({
      score: run.score,
      clearedAt: run.clearedAt,
      dateLabel: dateLabelFromClearedAt(run.clearedAt),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.clearedAt.localeCompare(a.clearedAt);
    });
}

export function formatHighScoreHeader(): string {
  return `${"TIME".padEnd(HIGH_SCORE_TIME_WIDTH)}${HIGH_SCORE_COLUMN_GAP}${"DATE".padEnd(HIGH_SCORE_DATE_WIDTH)}`;
}

export function formatHighScoreLine(row: HighScoreRow): string {
  return `${String(row.score).padStart(HIGH_SCORE_TIME_WIDTH)}${HIGH_SCORE_COLUMN_GAP}${row.dateLabel.padEnd(HIGH_SCORE_DATE_WIDTH)}`;
}
