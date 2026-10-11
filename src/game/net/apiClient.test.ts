import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRunLog, TEST_RUN_LOG_META } from "../../domain/runLog";
import { MAX_UPLOADS_PER_DRAIN } from "../../domain/runUpload";
import { savePrivacySettings } from "../storage/privacySettingsStorage";
import { saveRunLog } from "../storage/runLogStorage";
import { loadUploadState } from "../storage/runUploadStorage";
import { installMemoryStorage } from "../storage/testMemoryStorage";
import { drainRunUploads } from "./apiClient";

function seedRuns(count: number): void {
  loadUploadState();
  for (let i = 0; i < count; i += 1) {
    const meta = {
      ...TEST_RUN_LOG_META,
      id: `run-${String(i).padStart(2, "0")}`,
      startedAt: new Date(Date.now() + 1000 + i).toISOString(),
    };
    saveRunLog({ ...createRunLog(meta, "s", false), outcome: "death" });
  }
}

function stubFetch(...statuses: number[]) {
  const fetchMock = vi.fn(
    async (_url: string, _init?: RequestInit) =>
      new Response("{}", { status: statuses.shift() ?? 201 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  installMemoryStorage();
  vi.stubEnv("VITE_API_URL", "https://api.test/");
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("drainRunUploads", () => {
  it("does nothing without an API URL", async () => {
    vi.stubEnv("VITE_API_URL", "");
    seedRuns(1);
    const fetchMock = stubFetch();
    await drainRunUploads();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing when the player opted out", async () => {
    savePrivacySettings({ shareRunStats: false });
    seedRuns(1);
    const fetchMock = stubFetch();
    await drainRunUploads();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts each finished run once to /runs and marks it uploaded", async () => {
    seedRuns(2);
    const fetchMock = stubFetch(201, 201);
    await drainRunUploads();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]![0]).toBe("https://api.test/runs");
    expect(loadUploadState().uploaded).toEqual(["run-00", "run-01"]);
    await drainRunUploads();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks a 400 as done but stops on 429 and keeps the rest queued", async () => {
    seedRuns(3);
    stubFetch(400, 429);
    await drainRunUploads();
    expect(loadUploadState().uploaded).toEqual(["run-00"]);
  });

  it("stops quietly on a network error", async () => {
    seedRuns(1);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    await drainRunUploads();
    expect(loadUploadState().uploaded).toEqual([]);
  });

  it("sends at most one batch per drain and never two drains at once", async () => {
    seedRuns(MAX_UPLOADS_PER_DRAIN + 2);
    const fetchMock = stubFetch();
    await Promise.all([drainRunUploads(), drainRunUploads()]);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_UPLOADS_PER_DRAIN);
  });
});
