import { describe, expect, it } from "vitest";
import { PLAYER_INVULN_TINT, PLAYER_WALL_PASS_TINT, brightenColor, playerTint } from "./playerTint";

const idle = { wallPassOn: false, invulnRemainingMs: 0, nowMs: 0, flashBrighten: 0 };

describe("playerTint", () => {
  it("is untinted with nothing active", () => {
    expect(playerTint(idle)).toBeNull();
  });

  it("adds a gray brighten for a turn flash alone", () => {
    expect(playerTint({ ...idle, flashBrighten: 0.2 })).toEqual({ color: 0x333333, mode: "add" });
  });

  it("multiplies gold while invulnerable", () => {
    expect(playerTint({ ...idle, invulnRemainingMs: 5000 })).toEqual({
      color: PLAYER_INVULN_TINT,
      mode: "multiply",
    });
  });

  it("keeps the gold tint, brightened, through a turn flash while invulnerable", () => {
    expect(playerTint({ ...idle, invulnRemainingMs: 5000, flashBrighten: 0.2 })).toEqual({
      color: brightenColor(PLAYER_INVULN_TINT, 0.2),
      mode: "multiply",
    });
  });

  it("keeps the wall-pass tint, brightened, through a turn flash", () => {
    expect(
      playerTint({ ...idle, wallPassOn: true, invulnRemainingMs: 5000, flashBrighten: 0.2 }),
    ).toEqual({
      color: brightenColor(PLAYER_WALL_PASS_TINT, 0.2),
      mode: "multiply",
    });
  });

  it("blinks the gold tint in the last second", () => {
    expect(playerTint({ ...idle, invulnRemainingMs: 900, nowMs: 50 })?.color).toBe(
      PLAYER_INVULN_TINT,
    );
    expect(playerTint({ ...idle, invulnRemainingMs: 900, nowMs: 150 })).toBeNull();
  });
});
