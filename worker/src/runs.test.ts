import { describe, expect, it } from "vitest";
import { countryOrUnknown, upsertRunValues, validateUpload } from "./runs";
import { finishedRecord, INSTALL_ID, RUN_ID } from "./testRecord";

function upload(overrides: Parameters<typeof finishedRecord>[0] = {}, platform: unknown = "web") {
  return { platform, record: finishedRecord(overrides) };
}

describe("validateUpload", () => {
  it("accepts a finished, non-debug run", () => {
    expect(validateUpload(upload())?.record.id).toBe(RUN_ID);
  });

  it.each(["death", "complete", "quit", "abandoned"] as const)("accepts outcome %s", (outcome) => {
    expect(validateUpload(upload({ outcome }))).not.toBeNull();
  });

  it("rejects in-progress and debug runs", () => {
    expect(validateUpload(upload({ outcome: "inProgress" }))).toBeNull();
    expect(validateUpload(upload({ debug: true }))).toBeNull();
  });

  it("rejects bad platforms, ids and shapes", () => {
    expect(validateUpload(upload({}, "switch"))).toBeNull();
    expect(validateUpload(upload({ id: "test" }))).toBeNull();
    expect(validateUpload(upload({ installId: "nope" }))).toBeNull();
    expect(validateUpload({ platform: "web" })).toBeNull();
    expect(validateUpload("x")).toBeNull();
    expect(validateUpload(null)).toBeNull();
  });

  it("checks level, pellet and version bounds just inside and outside", () => {
    expect(validateUpload(upload({ finalLevel: 1 }))).not.toBeNull();
    expect(validateUpload(upload({ finalLevel: 99 }))).not.toBeNull();
    expect(validateUpload(upload({ finalLevel: 0 }))).toBeNull();
    expect(validateUpload(upload({ finalLevel: 100 }))).toBeNull();
    expect(validateUpload(upload({ pelletsCollected: 100_000 }))).not.toBeNull();
    expect(validateUpload(upload({ pelletsCollected: 100_001 }))).toBeNull();
    expect(validateUpload(upload({ pelletsCollected: -1 }))).toBeNull();
    expect(validateUpload(upload({ pelletsCollected: 1.5 }))).toBeNull();
    expect(validateUpload(upload({ gameVersion: "" }))).toBeNull();
    expect(validateUpload(upload({ gameVersion: "x".repeat(64) }))).not.toBeNull();
    expect(validateUpload(upload({ gameVersion: "x".repeat(65) }))).toBeNull();
  });
});

describe("countryOrUnknown", () => {
  it("keeps two capital letters, else XX", () => {
    expect(countryOrUnknown("US")).toBe("US");
    expect(countryOrUnknown("usa")).toBe("XX");
    expect(countryOrUnknown(undefined)).toBe("XX");
  });
});

describe("upsertRunValues", () => {
  it("binds indexed columns plus the raw record", () => {
    const parsed = validateUpload(upload())!;
    const values = upsertRunValues(parsed, { country: "US", ipHash: "h", receivedAt: "t" });
    expect(values.slice(0, 11)).toEqual([
      RUN_ID,
      INSTALL_ID,
      1,
      "abc1234",
      "web",
      "death",
      1,
      120,
      "US",
      "h",
      "t",
    ]);
    expect(JSON.parse(values[11] as string).id).toBe(RUN_ID);
  });
});
