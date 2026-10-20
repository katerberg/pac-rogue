import { describe, expect, it } from "vitest";
import { parseSlotMachineFlag } from "./slotMachineFlag";

describe("parseSlotMachineFlag", () => {
  it("is true only for slotMachine=1", () => {
    expect(parseSlotMachineFlag(new URLSearchParams("slotMachine=1"))).toBe(true);
    expect(parseSlotMachineFlag(new URLSearchParams("slotMachine=0"))).toBe(false);
    expect(parseSlotMachineFlag(new URLSearchParams())).toBe(false);
  });
});
