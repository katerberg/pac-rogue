import { describe, expect, it } from "vitest";
import { parseStoreFlag } from "./storeFlag";

describe("parseStoreFlag", () => {
  it("accepts 1, 2 and 3 as the store index", () => {
    expect(parseStoreFlag(new URLSearchParams("store=1"))).toBe(1);
    expect(parseStoreFlag(new URLSearchParams("store=2"))).toBe(2);
    expect(parseStoreFlag(new URLSearchParams("store=3"))).toBe(3);
  });

  it("rejects anything else", () => {
    expect(parseStoreFlag(new URLSearchParams("store=true"))).toBeNull();
    expect(parseStoreFlag(new URLSearchParams("store=0"))).toBeNull();
    expect(parseStoreFlag(new URLSearchParams("store=4"))).toBeNull();
    expect(parseStoreFlag(new URLSearchParams())).toBeNull();
  });
});
