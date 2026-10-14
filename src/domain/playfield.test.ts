import { describe, expect, it } from "vitest";
import {
  BLINKY_DRAWABLE_ID,
  GHOST_DRAWABLE_BY_KIND,
  isActorDrawableId,
  PELLET_DRAWABLE_ID,
  PLAYER_DRAWABLE_ID,
  POWER_PELLET_DRAWABLE_ID,
} from "./playfield";

describe("isActorDrawableId", () => {
  it("covers Dot-Man and every ghost kind", () => {
    expect(isActorDrawableId(PLAYER_DRAWABLE_ID)).toBe(true);
    expect(isActorDrawableId(BLINKY_DRAWABLE_ID)).toBe(true);
    for (const id of Object.values(GHOST_DRAWABLE_BY_KIND)) {
      expect(isActorDrawableId(id)).toBe(true);
    }
  });

  it("excludes pellets and fruit", () => {
    expect(isActorDrawableId(PELLET_DRAWABLE_ID)).toBe(false);
    expect(isActorDrawableId(POWER_PELLET_DRAWABLE_ID)).toBe(false);
    expect(isActorDrawableId("cherries")).toBe(false);
  });
});
