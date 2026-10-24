import { describe, expect, it } from "vitest";
import { HUNTER_FRIGHTENED_MS } from "../../../domain/hunter";
import { FREEZE_MS, INVULN_MS, SPEED_BURST_MS } from "../../../domain/upgrades";
import { powerPelletAffordance } from "./affordances";

const STEP_MS = 100;

describe("powerPelletAffordance", () => {
  it("is nothing without upgrades", () => {
    expect(powerPelletAffordance([], 1, STEP_MS)).toBeNull();
  });

  it("reads durations from the game's own power-pellet application", () => {
    expect(powerPelletAffordance(["powerPelletInvuln"], 1, STEP_MS)).toMatchObject({
      invulnSteps: INVULN_MS / STEP_MS,
      frightSteps: 0,
      shieldGain: 0,
    });
    expect(powerPelletAffordance(["powerPelletHunter"], 1, STEP_MS)!.frightSteps).toBe(
      HUNTER_FRIGHTENED_MS / STEP_MS,
    );
    expect(powerPelletAffordance(["powerPelletFreeze"], 1, STEP_MS)!.freezeSteps).toBe(
      FREEZE_MS / STEP_MS,
    );
    expect(powerPelletAffordance(["powerPelletSpeedBurst"], 1, STEP_MS)).toMatchObject({
      speedMul: 1.25,
      speedSteps: SPEED_BURST_MS / STEP_MS,
    });
  });

  it("follows level scaling and Overcharge", () => {
    const level5 = powerPelletAffordance(["powerPelletInvuln"], 5, STEP_MS)!;
    expect(level5.invulnSteps).toBeLessThan(INVULN_MS / STEP_MS);
    const charged = powerPelletAffordance(["powerPelletInvuln", "passiveOvercharge"], 1, STEP_MS)!;
    expect(charged.invulnSteps).toBe((2 * INVULN_MS) / STEP_MS);
  });

  it("banks a shield and fires nothing on pickup under Shield Break", () => {
    expect(powerPelletAffordance(["passiveShieldPellets"], 1, STEP_MS)!.shieldGain).toBe(1);
    expect(
      powerPelletAffordance(["powerPelletInvuln", "passiveShieldBreak"], 1, STEP_MS),
    ).toMatchObject({ invulnSteps: 0 });
  });
});
