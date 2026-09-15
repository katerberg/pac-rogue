import { describe, expect, it } from "vitest";
import { pelletCollectSfxId } from "./sfx";

describe("pelletCollectSfxId", () => {
  it("uses munch for non-multiples of 2", () => {
    expect(pelletCollectSfxId(1)).toBe("pelletMunch");
    expect(pelletCollectSfxId(3)).toBe("pelletMunch");
    expect(pelletCollectSfxId(5)).toBe("pelletMunch");
    expect(pelletCollectSfxId(7)).toBe("pelletMunch");
  });

  it("uses pickup2 every other pellet", () => {
    expect(pelletCollectSfxId(2)).toBe("pelletMunch2");
    expect(pelletCollectSfxId(4)).toBe("pelletMunch2");
    expect(pelletCollectSfxId(6)).toBe("pelletMunch2");
  });

  it("treats non-positive pickup numbers as munch", () => {
    expect(pelletCollectSfxId(0)).toBe("pelletMunch");
    expect(pelletCollectSfxId(-3)).toBe("pelletMunch");
  });
});
