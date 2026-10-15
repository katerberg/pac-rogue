import { describe, expect, it } from "vitest";
import { cellKind } from "./renderBoard";

describe("renderBoard", () => {
  it("maps ASCII glyphs to cell kinds", () => {
    expect(cellKind("#")).toBe("wall");
    expect(cellKind(".")).toBe("pellet");
    expect(cellKind("@")).toBe("power");
    expect(cellKind("=")).toBe("door");
    expect(cellKind("H")).toBe("house");
    expect(cellKind("P")).toBe("spawn");
    expect(cellKind("-")).toBe("empty");
    expect(cellKind(" ")).toBe("empty");
  });
});
