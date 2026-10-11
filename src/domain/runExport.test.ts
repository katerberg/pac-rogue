import { describe, expect, it } from "vitest";
import { parseRunExport } from "./runExport";
import { syntheticRunLog, TEST_RUN_LOG_META } from "./runLog";

describe("parseRunExport", () => {
  it("keeps readable runs and counts the rest", () => {
    const runs = [syntheticRunLog(1, TEST_RUN_LOG_META), { version: 9 }];
    const parsed = parseRunExport({
      exportedAt: "2026-10-12T00:00:00Z",
      source: "pac-rogue",
      runs,
    });
    expect(parsed?.runs).toHaveLength(1);
    expect(parsed?.unreadable).toBe(1);
    expect(parsed?.exportedAt).toBe("2026-10-12T00:00:00Z");
  });

  it("rejects other shapes", () => {
    expect(parseRunExport(null)).toBeNull();
    expect(parseRunExport({ exportedAt: "x", source: "other", runs: [] })).toBeNull();
    expect(parseRunExport({ exportedAt: "x", source: "pac-rogue" })).toBeNull();
  });
});
