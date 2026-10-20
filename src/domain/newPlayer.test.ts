import { describe, expect, it } from "vitest";
import { FIRST_PLAY_STARTING_UPGRADE, preferredStartingUpgrade } from "./newPlayer";

describe("preferredStartingUpgrade", () => {
  it("forces Freeze when no runs are stored yet", () => {
    expect(preferredStartingUpgrade(0)).toBe(FIRST_PLAY_STARTING_UPGRADE);
    expect(FIRST_PLAY_STARTING_UPGRADE).toBe("powerPelletFreeze");
  });

  it("returns null once any run has been stored", () => {
    expect(preferredStartingUpgrade(1)).toBeNull();
    expect(preferredStartingUpgrade(12)).toBeNull();
  });
});
