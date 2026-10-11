import type { RunLogRecord } from "./runLog";

export const PLATFORMS = ["web", "itch", "steam"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const MAX_UPLOADS_PER_DRAIN = 10;

export type UploadState = { since: string; uploaded: string[] };
export type RunUpload = { platform: Platform; record: RunLogRecord };

export function parsePlatform(value: string | undefined): Platform {
  return PLATFORMS.find((platform) => platform === value) ?? "web";
}

export function parseUploadState(raw: string | null): UploadState | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    const { since, uploaded } = parsed as Record<string, unknown>;
    if (
      typeof since !== "string" ||
      !Array.isArray(uploaded) ||
      !uploaded.every((id) => typeof id === "string")
    ) {
      return null;
    }
    return { since, uploaded };
  } catch {
    return null;
  }
}

export function uploadable(record: RunLogRecord, state: UploadState): boolean {
  return (
    record.outcome !== "inProgress" &&
    !record.debug &&
    record.startedAt >= state.since &&
    !state.uploaded.includes(record.id)
  );
}

export function nextUploads(
  records: readonly RunLogRecord[],
  state: UploadState,
  max = MAX_UPLOADS_PER_DRAIN,
): RunLogRecord[] {
  return records
    .filter((record) => uploadable(record, state))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .slice(0, max);
}
