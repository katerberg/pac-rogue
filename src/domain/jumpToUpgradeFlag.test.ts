import { describe, expect, it } from "vitest";
import { parseJumpToUpgradeFlag } from "./jumpToUpgradeFlag";

describe("parseJumpToUpgradeFlag", () => {
  it("is true only for jumpToUpgrade=1", () => {
    expect(parseJumpToUpgradeFlag(new URLSearchParams("jumpToUpgrade=1"))).toBe(true);
    expect(parseJumpToUpgradeFlag(new URLSearchParams("jumpToUpgrade=true"))).toBe(false);
    expect(parseJumpToUpgradeFlag(new URLSearchParams("jumpToUpgrade=0"))).toBe(false);
    expect(parseJumpToUpgradeFlag(new URLSearchParams())).toBe(false);
  });
});
