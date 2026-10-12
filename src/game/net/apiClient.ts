import { parseGlobalScores, type GlobalBoard } from "../../domain/leaderboard";
import { nextUploads, parsePlatform, resolveApiUrl, type RunUpload } from "../../domain/runUpload";
import { loadPrivacySettings } from "../storage/privacySettingsStorage";
import { getInstallId, runsNewestFirst } from "../storage/runLogStorage";
import { loadUploadState, markUploaded } from "../storage/runUploadStorage";

const REQUEST_TIMEOUT_MS = 5000;

let draining = false;

function apiBaseUrl(): string | null {
  return resolveApiUrl(import.meta.env.VITE_API_URL, location.hostname, import.meta.env.DEV);
}

async function uploadRun(baseUrl: string, body: RunUpload): Promise<"done" | "retry"> {
  const response = await fetch(`${baseUrl}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return response.ok || response.status === 400 ? "done" : "retry";
}

export async function drainRunUploads(): Promise<void> {
  const baseUrl = apiBaseUrl();
  if (baseUrl === null || draining || !loadPrivacySettings().shareRunStats) {
    return;
  }
  draining = true;
  try {
    const platform = parsePlatform(import.meta.env.VITE_PLATFORM);
    const state = loadUploadState();
    const sent = new Set(state.uploaded);
    for (const record of nextUploads(
      runsNewestFirst((id) => sent.has(id)),
      state,
    )) {
      if ((await uploadRun(baseUrl, { platform, record: { ...record, params: {} } })) === "retry") {
        return;
      }
      markUploaded(record.id);
    }
  } catch {
    console.warn("run upload failed; will retry later");
  } finally {
    draining = false;
  }
}

export async function fetchGlobalScores(): Promise<GlobalBoard> {
  const baseUrl = apiBaseUrl();
  if (baseUrl === null) {
    return { kind: "offline" };
  }
  try {
    const response = await fetch(
      `${baseUrl}/scores?installId=${encodeURIComponent(getInstallId())}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
    const rows = response.ok ? parseGlobalScores(await response.json()) : null;
    return rows === null ? { kind: "error" } : { kind: "ok", rows };
  } catch {
    return { kind: "error" };
  }
}
