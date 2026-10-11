import { afterEach, describe, expect, it, vi } from "vitest";
import { createRunLog, TEST_RUN_LOG_META } from "../../domain/runLog";
import { purgeOldestRuns, saveRunLog } from "./runLogStorage";
import {
  forgetUploaded,
  loadUploadState,
  markUploaded,
  RUN_UPLOAD_STORAGE_KEY,
} from "./runUploadStorage";
import { installMemoryStorage } from "./testMemoryStorage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("runUploadStorage", () => {
  it("writes the no-backfill marker on first load and keeps it", () => {
    vi.useFakeTimers({ now: new Date("2026-10-12T05:00:00.000Z") });
    const store = installMemoryStorage();
    expect(loadUploadState()).toEqual({ since: "2026-10-12T05:00:00.000Z", uploaded: [] });
    vi.setSystemTime(new Date("2026-10-13T00:00:00.000Z"));
    expect(loadUploadState().since).toBe("2026-10-12T05:00:00.000Z");
    expect(store.has(RUN_UPLOAD_STORAGE_KEY)).toBe(true);
  });

  it("marks ids once and forgets them", () => {
    installMemoryStorage();
    markUploaded("a");
    markUploaded("a");
    markUploaded("b");
    expect(loadUploadState().uploaded).toEqual(["a", "b"]);
    forgetUploaded(["a"]);
    expect(loadUploadState().uploaded).toEqual(["b"]);
  });

  it("does not create the marker when forgetting before any upload", () => {
    const store = installMemoryStorage();
    forgetUploaded(["a"]);
    expect(store.has(RUN_UPLOAD_STORAGE_KEY)).toBe(false);
  });

  it("forgets the ids a run-log purge deletes", () => {
    installMemoryStorage();
    const ids = Array.from({ length: 12 }, (_, i) => `run-${i}`);
    for (const id of ids) {
      saveRunLog({ ...createRunLog({ ...TEST_RUN_LOG_META, id }, "s", false), outcome: "death" });
      markUploaded(id);
    }
    purgeOldestRuns();
    expect(loadUploadState().uploaded).toEqual(["run-10", "run-11"]);
  });
});
