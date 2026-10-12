import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRunLog, TEST_RUN_LOG_META } from "../../domain/runLog";
import { MAX_UPLOADS_PER_DRAIN } from "../../domain/runUpload";
import { savePrivacySettings } from "../storage/privacySettingsStorage";
import { getInstallId, saveRunLog } from "../storage/runLogStorage";
import { loadUploadState } from "../storage/runUploadStorage";
import { installMemoryStorage } from "../storage/testMemoryStorage";
import { drainRunUploads, fetchGlobalScores } from "./apiClient";

function seedRuns(count: number): void {
  loadUploadState();
  for (let i = 0; i < count; i += 1) {
    const meta = {
      ...TEST_RUN_LOG_META,
      params: { play: "1", fbclid: "tracking" },
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
  vi.stubGlobal("location", { hostname: "katerberg.github.io" });
  vi.stubEnv("VITE_API_URL", "https://api.test/");
  vi.stubEnv("DEV", false);
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

  it("never uploads from a localhost page to a non-local API", async () => {
    vi.stubGlobal("location", { hostname: "127.0.0.1" });
    seedRuns(1);
    const fetchMock = stubFetch();
    await drainRunUploads();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never uploads to a non-local API from the dev server", async () => {
    vi.stubEnv("DEV", true);
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
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body).toMatchObject({ platform: "web", record: { id: "run-00", params: {} } });
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

describe("fetchGlobalScores", () => {
  const row = {
    pellets: 5,
    reach: 2,
    country: "US",
    receivedAt: "2026-10-12T01:00:00Z",
    mine: true,
  };

  function stubBoard(status: number, body: unknown) {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("is offline without an API URL and never fetches", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = stubBoard(200, { scores: [row] });
    expect(await fetchGlobalScores()).toEqual({ kind: "offline" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches the board with this install id", async () => {
    const fetchMock = stubBoard(200, { scores: [row] });
    expect(await fetchGlobalScores()).toEqual({ kind: "ok", rows: [row] });
    expect(fetchMock.mock.calls[0]![0]).toBe(`https://api.test/scores?installId=${getInstallId()}`);
  });

  it("reports an error for a failed request or a malformed board", async () => {
    stubBoard(500, { scores: [row] });
    expect(await fetchGlobalScores()).toEqual({ kind: "error" });
    stubBoard(200, { scores: [{ pellets: "lots" }] });
    expect(await fetchGlobalScores()).toEqual({ kind: "error" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    expect(await fetchGlobalScores()).toEqual({ kind: "error" });
  });
});
