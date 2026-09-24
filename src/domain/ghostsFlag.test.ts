import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import { parseGhostsParam } from "./ghostsFlag";

describe("parseGhostsParam", () => {
  it("reads a single ghost name", () => {
    expect(parseGhostsParam(new URLSearchParams("ghosts=pinky"))).toEqual([GHOST_KIND.pinky]);
  });

  it("reads comma-separated and repeated names in order without duplicates", () => {
    expect(parseGhostsParam(new URLSearchParams("ghosts=clyde,blinky&ghosts=inky,clyde"))).toEqual([
      GHOST_KIND.clyde,
      GHOST_KIND.blinky,
      GHOST_KIND.inky,
    ]);
  });

  it("skips unknown names and returns null when nothing valid remains", () => {
    expect(parseGhostsParam(new URLSearchParams("ghosts=nope,pinky"))).toEqual([GHOST_KIND.pinky]);
    expect(parseGhostsParam(new URLSearchParams("ghosts=nope"))).toBeNull();
    expect(parseGhostsParam(new URLSearchParams("ghosts="))).toBeNull();
    expect(parseGhostsParam(new URLSearchParams("ghosts=toString"))).toBeNull();
    expect(parseGhostsParam(new URLSearchParams())).toBeNull();
  });
});
