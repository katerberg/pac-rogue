import { describe, expect, it } from "vitest";
import { parseGodModeFlag } from "./godModeFlag";

describe("parseGodModeFlag", () => {
  it("only accepts godMode=1", () => {
    expect(parseGodModeFlag(new URLSearchParams("godMode=1"))).toBe(true);
    expect(parseGodModeFlag(new URLSearchParams("godMode=0"))).toBe(false);
    expect(parseGodModeFlag(new URLSearchParams())).toBe(false);
  });
});
