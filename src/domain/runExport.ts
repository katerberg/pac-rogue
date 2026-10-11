import { parseRunLogRecord, type RunLogRecord } from "./runLog";

export const RUN_EXPORT_SOURCE = "pac-rogue";

export type RunExport = { exportedAt: string; runs: RunLogRecord[]; unreadable: number };

export function parseRunExport(json: unknown): RunExport | null {
  if (json === null || typeof json !== "object") {
    return null;
  }
  const { exportedAt, source, runs } = json as Record<string, unknown>;
  if (typeof exportedAt !== "string" || source !== RUN_EXPORT_SOURCE || !Array.isArray(runs)) {
    return null;
  }
  const parsed = runs.map((run) => parseRunLogRecord(JSON.stringify(run)));
  const valid = parsed.filter((run): run is RunLogRecord => run !== null);
  return { exportedAt, runs: valid, unreadable: parsed.length - valid.length };
}
