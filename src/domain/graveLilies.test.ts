import { describe, expect, it } from "vitest";
import { GRAVE_LILIES_CHARGES_PER_LEVEL, takeGraveLiliesCharge } from "./graveLilies";

describe("takeGraveLiliesCharge", () => {
  it("drops once and spends the charge", () => {
    const first = takeGraveLiliesCharge(GRAVE_LILIES_CHARGES_PER_LEVEL);
    expect(first).toEqual({ charges: 0, drop: true });
    expect(takeGraveLiliesCharge(first.charges)).toEqual({ charges: 0, drop: false });
  });
});
