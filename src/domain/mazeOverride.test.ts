import { describe, expect, it } from "vitest";
import { parseMazeOverride } from "./mazeOverride";
import { mazePoolSize } from "./mazePool";

describe("parseMazeOverride", () => {
  it("parses named fixtures and dense pool indexes", () => {
    expect(parseMazeOverride(new URLSearchParams("maze=maze1"))).toBe("maze1");
    expect(parseMazeOverride(new URLSearchParams("maze=0"))).toBe(0);
    expect(parseMazeOverride(new URLSearchParams(`maze=${mazePoolSize() - 1}`))).toBe(
      mazePoolSize() - 1,
    );
  });

  it("rejects unknown names and out-of-range indexes", () => {
    expect(parseMazeOverride(new URLSearchParams("maze=nope"))).toBeNull();
    expect(parseMazeOverride(new URLSearchParams(`maze=${mazePoolSize()}`))).toBeNull();
    expect(parseMazeOverride(new URLSearchParams())).toBeNull();
  });
});
