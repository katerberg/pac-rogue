import { describe, expect, it } from "vitest";
import { parseQueryParams } from "./queryParams";

describe("parseQueryParams", () => {
  it("treats a bare flag as =1", () => {
    const params = parseQueryParams("?learnAll&enableUpgrade=passiveGhostSlow");
    expect(params.get("learnAll")).toBe("1");
    expect(params.get("enableUpgrade")).toBe("passiveGhostSlow");
  });

  it("keeps explicit empty values and ordinary values", () => {
    const params = parseQueryParams("?play&seed=&level=3&sound=0");
    expect(params.get("play")).toBe("1");
    expect(params.get("seed")).toBe("");
    expect(params.get("level")).toBe("3");
    expect(params.get("sound")).toBe("0");
  });

  it("handles an empty search string", () => {
    expect([...parseQueryParams("")]).toEqual([]);
    expect([...parseQueryParams("?")]).toEqual([]);
  });
});
