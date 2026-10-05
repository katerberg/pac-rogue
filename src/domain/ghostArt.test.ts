import { describe, expect, it } from "vitest";
import { ghostArtStyle } from "./ghostArt";
import { GHOST_KIND } from "./ghostKind";

describe("ghostArtStyle", () => {
  it("draws Clyde as line art on levels 5-8 only", () => {
    for (const level of [1, 4, 9]) {
      expect(ghostArtStyle(GHOST_KIND.clyde, level)).toBe("pixel");
    }
    for (const level of [5, 6, 8]) {
      expect(ghostArtStyle(GHOST_KIND.clyde, level)).toBe("line");
    }
  });

  it("keeps the other ghosts pixel art", () => {
    for (const kind of [GHOST_KIND.blinky, GHOST_KIND.pinky, GHOST_KIND.inky]) {
      for (const level of [5, 6, 7, 8]) {
        expect(ghostArtStyle(kind, level)).toBe("pixel");
      }
    }
  });
});
