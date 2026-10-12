import { parseRunLogRecord } from "../../src/domain/runLog";
import { PLATFORMS, type RunUpload } from "../../src/domain/runUpload";

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_MS = 600_000;
export const MAX_BODY_BYTES = 65_536;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FINISHED = ["death", "complete", "quit", "abandoned"];

function intIn(value: unknown, min: number, max: number): boolean {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

export function validateUpload(body: unknown): RunUpload | null {
  if (body === null || typeof body !== "object") {
    return null;
  }
  const { platform, record: raw } = body as Record<string, unknown>;
  if (!PLATFORMS.some((p) => p === platform)) {
    return null;
  }
  const record = parseRunLogRecord(JSON.stringify(raw ?? null));
  if (
    record === null ||
    !FINISHED.includes(record.outcome) ||
    record.debug ||
    !UUID.test(record.id) ||
    !UUID.test(record.installId) ||
    !intIn(record.finalLevel, 1, 99) ||
    !intIn(record.pelletsCollected, 0, 100_000) ||
    typeof record.gameVersion !== "string" ||
    record.gameVersion.length < 1 ||
    record.gameVersion.length > 64
  ) {
    return null;
  }
  return { platform: platform as RunUpload["platform"], record };
}

export function countryOrUnknown(value: unknown): string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value) ? value : "XX";
}

export const COUNT_RECENT_BY_IP_HASH =
  "SELECT COUNT(*) AS n FROM runs WHERE ip_hash = ? AND received_at > ?";

export const UPSERT_RUN = `INSERT INTO runs
  (id, install_id, schema_version, game_version, platform, outcome, final_level, pellets,
   country, ip_hash, received_at, record)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    outcome = excluded.outcome,
    final_level = excluded.final_level,
    pellets = excluded.pellets,
    record = excluded.record,
    received_at = excluded.received_at
  WHERE runs.install_id = excluded.install_id`;

export function upsertRunValues(
  upload: RunUpload,
  meta: { country: string; ipHash: string; receivedAt: string },
): unknown[] {
  const { record } = upload;
  return [
    record.id,
    record.installId,
    record.version,
    record.gameVersion,
    upload.platform,
    record.outcome,
    record.finalLevel,
    record.pelletsCollected,
    meta.country,
    meta.ipHash,
    meta.receivedAt,
    JSON.stringify(record),
  ];
}
