import { describe, expect, it } from "vitest";
import { fruitArtIdOfPath } from "./fruitArt";

describe("fruitArtIdOfPath", () => {
  it("takes the PNG stem from a Vite glob path", () => {
    expect(fruitArtIdOfPath("../art/fruit/watermelon.png")).toBe("watermelon");
    expect(fruitArtIdOfPath("/abs/path/cherries.png")).toBe("cherries");
  });
});
