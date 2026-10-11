import { describe, expect, it } from "vitest";
import { createRunLog, TEST_RUN_LOG_META, type RunLogRecord } from "./runLog";
import {
  MAX_UPLOADS_PER_DRAIN,
  nextUploads,
  parsePlatform,
  parseUploadState,
  uploadable,
  type UploadState,
} from "./runUpload";

const SINCE = "2026-10-12T00:00:00.000Z";
const STATE: UploadState = { since: SINCE, uploaded: [] };

function run(id: string, overrides: Partial<RunLogRecord> = {}): RunLogRecord {
  return {
    ...createRunLog(
      { ...TEST_RUN_LOG_META, id, startedAt: "2026-10-12T01:00:00.000Z" },
      "s",
      false,
    ),
    outcome: "death",
    ...overrides,
  };
}

describe("runUpload", () => {
  it("uploads only finished, non-debug runs started since the marker and not yet sent", () => {
    expect(uploadable(run("a"), STATE)).toBe(true);
    expect(uploadable(run("a", { outcome: "inProgress" }), STATE)).toBe(false);
    expect(uploadable(run("a", { debug: true }), STATE)).toBe(false);
    expect(uploadable(run("a", { startedAt: "2026-10-11T23:59:59.999Z" }), STATE)).toBe(false);
    expect(uploadable(run("a"), { since: SINCE, uploaded: ["a"] })).toBe(false);
  });

  it("queues the oldest runs first, capped per drain", () => {
    const runs = Array.from({ length: MAX_UPLOADS_PER_DRAIN + 3 }, (_, i) =>
      run(`r${i}`, { startedAt: `2026-10-12T${String(23 - i).padStart(2, "0")}:00:00.000Z` }),
    );
    const queued = nextUploads(runs, STATE);
    expect(queued).toHaveLength(MAX_UPLOADS_PER_DRAIN);
    expect(queued[0]!.id).toBe(`r${MAX_UPLOADS_PER_DRAIN + 2}`);
  });

  it("falls back to web for unknown platforms", () => {
    expect(parsePlatform("itch")).toBe("itch");
    expect(parsePlatform(undefined)).toBe("web");
    expect(parsePlatform("switch")).toBe("web");
  });

  it("parses upload state and rejects corrupt values", () => {
    expect(parseUploadState(JSON.stringify(STATE))).toEqual(STATE);
    expect(parseUploadState(null)).toBeNull();
    expect(parseUploadState("{oops")).toBeNull();
    expect(parseUploadState(JSON.stringify({ since: 1, uploaded: [] }))).toBeNull();
    expect(parseUploadState(JSON.stringify({ since: SINCE, uploaded: [1] }))).toBeNull();
  });
});
