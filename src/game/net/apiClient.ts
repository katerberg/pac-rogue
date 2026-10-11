import { nextUploads, parsePlatform, type RunUpload } from "../../domain/runUpload";
import { loadPrivacySettings } from "../storage/privacySettingsStorage";
import { loadAllRuns } from "../storage/runLogStorage";
import { loadUploadState, markUploaded } from "../storage/runUploadStorage";

const REQUEST_TIMEOUT_MS = 5000;

let draining = false;

function apiBaseUrl(): string | null {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, "") || null;
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
    for (const record of nextUploads(loadAllRuns().runs, loadUploadState())) {
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
