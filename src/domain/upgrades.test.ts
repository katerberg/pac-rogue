import { describe, expect, it } from "vitest";
import {
  FREEZE_MS,
  GHOST_SLOW_MUL,
  PLAYER_SPEED_UP_MUL,
  SCATTER_BURST_MS,
  applyPowerPelletEffects,
  createRunUpgrades,
  eligibleUpgrades,
  ghostsAreFrozen,
  grantRandomUpgrade,
  grantUpgrade,
  parseEnableUpgradeParams,
  parseUpgradeId,
  pickUpgrade,
  playerSpeedMultiplier,
  ghostSpeedMultiplier,
  scatterBurstActive,
  tickFreeze,
  tickScatterBurst,
  upgradeLabels,
  type RunUpgrades,
  type UpgradeId,
} from "./upgrades";

const ALL_IDS: UpgradeId[] = [
  "powerPelletFreeze",
  "playerSpeedUp",
  "ghostSlow",
  "scatterBurst",
  "ghostRecall",
  "warpTop",
];

function withForce(forceNextId: UpgradeId | null, owned: UpgradeId[] = []): RunUpgrades {
  return { ...createRunUpgrades(forceNextId), owned };
}

describe("parseUpgradeId", () => {
  it("parses known ids and rejects invalid", () => {
    expect(parseUpgradeId("ghostSlow")).toBe("ghostSlow");
    expect(parseUpgradeId("playerSpeedUp")).toBe("playerSpeedUp");
    expect(parseUpgradeId("powerPelletFreeze")).toBe("powerPelletFreeze");
    expect(parseUpgradeId("scatterBurst")).toBe("scatterBurst");
    expect(parseUpgradeId("ghostRecall")).toBe("ghostRecall");
    expect(parseUpgradeId("warpTop")).toBe("warpTop");
    expect(parseUpgradeId("nope")).toBeNull();
    expect(parseUpgradeId(null)).toBeNull();
    expect(parseUpgradeId("")).toBeNull();
  });
});

describe("parseEnableUpgradeParams / createRunUpgrades enabled", () => {
  it("collects all valid enableUpgrade values in order", () => {
    const params = new URLSearchParams(
      "enableUpgrade=ghostSlow&enableUpgrade=nope&enableUpgrade=playerSpeedUp&enableUpgrade=ghostSlow",
    );
    expect(parseEnableUpgradeParams(params)).toEqual(["ghostSlow", "playerSpeedUp", "ghostSlow"]);
  });

  it("returns empty when missing", () => {
    expect(parseEnableUpgradeParams(new URLSearchParams())).toEqual([]);
  });

  it("seeds owned immediately and dedupes via grant", () => {
    const state = createRunUpgrades(null, ["powerPelletFreeze", "ghostSlow", "powerPelletFreeze"]);
    expect(state.owned).toEqual(["powerPelletFreeze", "ghostSlow"]);
    expect(state.forceNextId).toBeNull();
    expect(state.scatterBurstRemainingMs).toBe(0);
  });
});

describe("eligibleUpgrades / pickUpgrade", () => {
  it("excludes owned ids", () => {
    expect(eligibleUpgrades([])).toEqual(ALL_IDS);
    expect(eligibleUpgrades(["playerSpeedUp"])).toEqual(
      ALL_IDS.filter((id) => id !== "playerSpeedUp"),
    );
    expect(eligibleUpgrades(ALL_IDS)).toEqual([]);
  });

  it("picks forced id when not owned", () => {
    expect(pickUpgrade([], () => 0, "ghostSlow")).toBe("ghostSlow");
  });

  it("ignores force when already owned and picks among eligible", () => {
    expect(pickUpgrade(["ghostSlow"], () => 0, "ghostSlow")).toBe("powerPelletFreeze");
  });

  it("returns null when pool empty", () => {
    expect(pickUpgrade(ALL_IDS, () => 0, null)).toBeNull();
  });

  it("uses rng for uniform pick", () => {
    expect(pickUpgrade([], () => 0, null)).toBe("powerPelletFreeze");
    expect(pickUpgrade([], () => 0.5, null)).toBe("scatterBurst");
    expect(pickUpgrade([], () => 0.99, null)).toBe("warpTop");
  });
});

describe("grantUpgrade / grantRandomUpgrade", () => {
  it("is idempotent for already owned", () => {
    const once = grantUpgrade(createRunUpgrades(), "ghostSlow");
    expect(grantUpgrade(once, "ghostSlow")).toEqual(once);
  });

  it("clears force even when pool empty", () => {
    const full = withForce("ghostSlow", ALL_IDS);
    const next = grantRandomUpgrade(full, () => 0);
    expect(next.forceNextId).toBeNull();
    expect(next.owned).toEqual(full.owned);
  });

  it("grants forced id and clears force", () => {
    const next = grantRandomUpgrade(withForce("playerSpeedUp"), () => 0.99);
    expect(next.owned).toEqual(["playerSpeedUp"]);
    expect(next.forceNextId).toBeNull();
  });

  it("when force already owned, picks remaining and clears force", () => {
    const next = grantRandomUpgrade(withForce("ghostSlow", ["ghostSlow"]), () => 0);
    expect(next.owned).toEqual(["ghostSlow", "powerPelletFreeze"]);
    expect(next.forceNextId).toBeNull();
  });
});

describe("freeze / power pellet", () => {
  it("ticks freeze down and expires", () => {
    const started = { ...createRunUpgrades(), freezeRemainingMs: FREEZE_MS };
    expect(ghostsAreFrozen(started)).toBe(true);
    const mid = tickFreeze(started, 1000);
    expect(mid.freezeRemainingMs).toBe(2000);
    const done = tickFreeze(mid, 2500);
    expect(done.freezeRemainingMs).toBe(0);
    expect(ghostsAreFrozen(done)).toBe(false);
  });

  it("applies freeze only when upgrade owned and refreshes to full", () => {
    const bare = createRunUpgrades();
    expect(applyPowerPelletEffects(bare, 1)).toEqual({
      state: bare,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
    });

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    const frozen = applyPowerPelletEffects(owned, 1);
    expect(frozen.state.freezeRemainingMs).toBe(FREEZE_MS);
    expect(frozen.recallClosestGhost).toBe(false);
    expect(frozen.warpPlayerTopCenter).toBe(false);

    const partial = { ...frozen.state, freezeRemainingMs: 500 };
    expect(applyPowerPelletEffects(partial, 2).state.freezeRemainingMs).toBe(FREEZE_MS);
  });

  it("powerRemoved zero is a no-op", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    expect(applyPowerPelletEffects(owned, 0)).toEqual({
      state: owned,
      recallClosestGhost: false,
      warpPlayerTopCenter: false,
    });
  });
});

describe("scatter burst / multi power-pellet effects", () => {
  it("ticks scatter burst down and expires", () => {
    const started = { ...createRunUpgrades(), scatterBurstRemainingMs: SCATTER_BURST_MS };
    expect(scatterBurstActive(started)).toBe(true);
    const mid = tickScatterBurst(started, 1000);
    expect(mid.scatterBurstRemainingMs).toBe(2000);
    const done = tickScatterBurst(mid, 2500);
    expect(done.scatterBurstRemainingMs).toBe(0);
    expect(scatterBurstActive(done)).toBe(false);
  });

  it("applies scatter burst when owned and refreshes", () => {
    const owned = grantUpgrade(createRunUpgrades(), "scatterBurst");
    const applied = applyPowerPelletEffects(owned, 1);
    expect(applied.state.scatterBurstRemainingMs).toBe(SCATTER_BURST_MS);
    const partial = { ...applied.state, scatterBurstRemainingMs: 100 };
    expect(applyPowerPelletEffects(partial, 1).state.scatterBurstRemainingMs).toBe(
      SCATTER_BURST_MS,
    );
  });

  it("fires all owned power-pellet effects together", () => {
    let state = createRunUpgrades();
    for (const id of ["powerPelletFreeze", "scatterBurst", "ghostRecall", "warpTop"] as const) {
      state = grantUpgrade(state, id);
    }
    const result = applyPowerPelletEffects(state, 1);
    expect(result.state.freezeRemainingMs).toBe(FREEZE_MS);
    expect(result.state.scatterBurstRemainingMs).toBe(SCATTER_BURST_MS);
    expect(result.recallClosestGhost).toBe(true);
    expect(result.warpPlayerTopCenter).toBe(true);
  });

  it("sets recall and warp flags from owned defs", () => {
    const recall = applyPowerPelletEffects(grantUpgrade(createRunUpgrades(), "ghostRecall"), 1);
    expect(recall.recallClosestGhost).toBe(true);
    expect(recall.warpPlayerTopCenter).toBe(false);

    const warp = applyPowerPelletEffects(grantUpgrade(createRunUpgrades(), "warpTop"), 1);
    expect(warp.recallClosestGhost).toBe(false);
    expect(warp.warpPlayerTopCenter).toBe(true);
  });
});

describe("speed multipliers / labels", () => {
  it("multiplies owned speed defs", () => {
    expect(playerSpeedMultiplier([])).toBe(1);
    expect(playerSpeedMultiplier(["playerSpeedUp"])).toBe(PLAYER_SPEED_UP_MUL);
    expect(ghostSpeedMultiplier(["ghostSlow"])).toBe(GHOST_SLOW_MUL);
    expect(ghostSpeedMultiplier(["playerSpeedUp"])).toBe(1);
  });

  it("maps owned ids to labels in order", () => {
    expect(upgradeLabels(["ghostSlow", "playerSpeedUp", "scatterBurst"])).toEqual([
      "Ghost Slow",
      "Speed Up",
      "Scatter Burst",
    ]);
  });
});
