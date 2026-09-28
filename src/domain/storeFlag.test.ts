import { describe, expect, it } from "vitest";
import { parseStoreFlag } from "./storeFlag";

describe("parseStoreFlag", () => {
  it("is true only for store=1", () => {
    expect(parseStoreFlag(new URLSearchParams("store=1"))).toBe(true);
    expect(parseStoreFlag(new URLSearchParams("store=true"))).toBe(false);
    expect(parseStoreFlag(new URLSearchParams("store=0"))).toBe(false);
    expect(parseStoreFlag(new URLSearchParams())).toBe(false);
  });
});
