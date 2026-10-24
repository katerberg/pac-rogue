import { describe, expect, it } from "vitest";
import { HUNTER_FRIGHTENED_MS } from "../../../domain/hunter";
import { FREEZE_MS, INVULN_MS, SPEED_BURST_MS } from "../../../domain/upgrades";
import { powerPelletAffordance } from "./affordances";

const STEP_MS = 100;

describe("powerPelletAffordance", () => {
  it("is nothing without upgrades", () => {
    expect(powerPelletAffordance([], 1, STEP_MS, 0)).toBeNull();
  });

  it("reads durations from the game's own power-pellet application", () => {
    expect(powerPelletAffordance(["powerPelletInvuln"], 1, STEP_MS, 0)).toMatchObject({
      invulnSteps: INVULN_MS / STEP_MS,
      frightSteps: 0,
      shieldGain: 0,
      firesOnPickup: true,
      firesOnBreak: false,
    });
    expect(powerPelletAffordance(["powerPelletHunter"], 1, STEP_MS, 0)!.frightSteps).toBe(
      HUNTER_FRIGHTENED_MS / STEP_MS,
    );
    expect(powerPelletAffordance(["powerPelletFreeze"], 1, STEP_MS, 0)!.freezeSteps).toBe(
      FREEZE_MS / STEP_MS,
    );
    expect(powerPelletAffordance(["powerPelletSpeedBurst"], 1, STEP_MS, 0)).toMatchObject({
      speedMul: 1.25,
      speedSteps: SPEED_BURST_MS / STEP_MS,
    });
  });

  it("follows level scaling and Overcharge", () => {
    const level5 = powerPelletAffordance(["powerPelletInvuln"], 5, STEP_MS, 0)!;
    expect(level5.invulnSteps).toBeLessThan(INVULN_MS / STEP_MS);
    const charged = powerPelletAffordance(
      ["powerPelletInvuln", "passiveOvercharge"],
      1,
      STEP_MS,
      0,
    )!;
    expect(charged.invulnSteps).toBe((2 * INVULN_MS) / STEP_MS);
  });

  it("banks a shield up to the cap and, under Shield Break, fires on the break instead of the pickup", () => {
    expect(powerPelletAffordance(["passiveShieldPellets"], 1, STEP_MS, 0)).toMatchObject({
      shieldGain: 1,
      shieldCap: 1,
    });
    const breaker = ["powerPelletInvuln", "passiveShieldPellets", "passiveShieldBreak"] as const;
    expect(powerPelletAffordance([...breaker], 1, STEP_MS, 0)).toMatchObject({
      invulnSteps: INVULN_MS / STEP_MS,
      firesOnPickup: false,
      firesOnBreak: true,
    });
    const plus = ["powerPelletInvuln", "passiveShieldPellets", "passiveShieldBreakPlus"] as const;
    expect(powerPelletAffordance([...plus], 1, STEP_MS, 0)!.firesOnPickup).toBe(false);
    expect(powerPelletAffordance([...plus], 1, STEP_MS, 1)!.firesOnPickup).toBe(true);
  });
});
