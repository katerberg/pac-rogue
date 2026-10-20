import { describe, expect, it } from "vitest";
import { advanceUpgradeTimers, upgradeTimerFractions } from "./upgradeTimers";
import { createRunUpgrades, type RunUpgrades } from "./upgrades";

const upgrades = (patch: Partial<RunUpgrades>): RunUpgrades => ({
  ...createRunUpgrades(),
  ...patch,
});

describe("advanceUpgradeTimers", () => {
  it("starts a timer at its first reading and pulses it", () => {
    const { timers, pulses } = advanceUpgradeTimers({}, upgrades({ speedBurstRemainingMs: 3000 }));
    expect(timers).toEqual({ powerPelletSpeedBurst: { remainingMs: 3000, totalMs: 3000 } });
    expect(pulses).toEqual(["powerPelletSpeedBurst"]);
  });

  it("drains against the starting total without pulsing", () => {
    const first = advanceUpgradeTimers({}, upgrades({ speedBurstRemainingMs: 3000 })).timers;
    const { timers, pulses } = advanceUpgradeTimers(
      first,
      upgrades({ speedBurstRemainingMs: 1000 }),
    );
    expect(upgradeTimerFractions(timers)).toEqual({ powerPelletSpeedBurst: 1000 / 3000 });
    expect(pulses).toEqual([]);
  });

  it("restarts and pulses when a timer is refreshed upward", () => {
    const first = advanceUpgradeTimers({}, upgrades({ wallPassRemainingMs: 6000 })).timers;
    const draining = advanceUpgradeTimers(first, upgrades({ wallPassRemainingMs: 2000 })).timers;
    const { timers, pulses } = advanceUpgradeTimers(
      draining,
      upgrades({ wallPassRemainingMs: 5000 }),
    );
    expect(timers.powerPelletWallPass).toEqual({ remainingMs: 5000, totalMs: 5000 });
    expect(pulses).toEqual(["powerPelletWallPass"]);
  });

  it("drops a timer once it runs out", () => {
    const first = advanceUpgradeTimers({}, upgrades({ invulnRemainingMs: 4000 })).timers;
    expect(advanceUpgradeTimers(first, upgrades({})).timers).toEqual({});
  });

  it("skips endless timers like an enhanced Haunting cage", () => {
    expect(advanceUpgradeTimers({}, upgrades({ hauntRemainingMs: Infinity })).timers).toEqual({});
  });

  it("drains Echo toward its latest pending fire", () => {
    const { timers } = advanceUpgradeTimers(
      {},
      upgrades({
        pendingEchoes: [
          { remainingMs: 1000, bases: [] },
          { remainingMs: 3000, bases: [] },
        ],
      }),
    );
    expect(timers.passiveEcho?.remainingMs).toBe(3000);
  });

  it("pulses fired instant effects once alongside started timers", () => {
    const { pulses } = advanceUpgradeTimers({}, upgrades({ freezeRemainingMs: 3000 }), [
      "powerPelletScatterBurst",
      "powerPelletFreeze",
      "powerPelletScatterBurst",
    ]);
    expect(pulses).toEqual(["powerPelletScatterBurst", "powerPelletFreeze"]);
  });
});
