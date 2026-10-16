import { describe, expect, it } from "vitest";
import { SMALL_MAZE_ASCII } from "../domain/mazeLayouts";
import { boardPixelSize, cellKind } from "./renderBoard";

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

  it("sizes the board to the activated layout pixels", () => {
    const size = boardPixelSize(SMALL_MAZE_ASCII);
    expect(size.width).toBe(22 * 16);
    expect(size.height).toBe(21 * 16);
  });
});
