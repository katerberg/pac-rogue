import { describe, expect, it } from "vitest";
import {
  FREEZE_MS,
  GHOST_SLOW_MUL,
  PLAYER_SPEED_UP_MUL,
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
  tickFreeze,
  upgradeLabels,
  type RunUpgrades,
  type UpgradeId,
} from "./upgrades";

function withForce(forceNextId: UpgradeId | null, owned: UpgradeId[] = []): RunUpgrades {
  return { ...createRunUpgrades(forceNextId), owned };
}

describe("parseUpgradeId", () => {
  it("parses known ids and rejects invalid", () => {
    expect(parseUpgradeId("ghostSlow")).toBe("ghostSlow");
    expect(parseUpgradeId("playerSpeedUp")).toBe("playerSpeedUp");
    expect(parseUpgradeId("powerPelletFreeze")).toBe("powerPelletFreeze");
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
  });
});

describe("eligibleUpgrades / pickUpgrade", () => {
  it("excludes owned ids", () => {
    expect(eligibleUpgrades([])).toEqual(["powerPelletFreeze", "playerSpeedUp", "ghostSlow"]);
    expect(eligibleUpgrades(["playerSpeedUp"])).toEqual(["powerPelletFreeze", "ghostSlow"]);
    expect(eligibleUpgrades(["powerPelletFreeze", "playerSpeedUp", "ghostSlow"])).toEqual([]);
  });

  it("picks forced id when not owned", () => {
    expect(pickUpgrade([], () => 0, "ghostSlow")).toBe("ghostSlow");
  });

  it("ignores force when already owned and picks among eligible", () => {
    expect(pickUpgrade(["ghostSlow"], () => 0, "ghostSlow")).toBe("powerPelletFreeze");
  });

  it("returns null when pool empty", () => {
    expect(
      pickUpgrade(["powerPelletFreeze", "playerSpeedUp", "ghostSlow"], () => 0, null),
    ).toBeNull();
  });

  it("uses rng for uniform pick", () => {
    expect(pickUpgrade([], () => 0, null)).toBe("powerPelletFreeze");
    expect(pickUpgrade([], () => 0.5, null)).toBe("playerSpeedUp");
    expect(pickUpgrade([], () => 0.99, null)).toBe("ghostSlow");
  });
});

describe("grantUpgrade / grantRandomUpgrade", () => {
  it("is idempotent for already owned", () => {
    const once = grantUpgrade(createRunUpgrades(), "ghostSlow");
    expect(grantUpgrade(once, "ghostSlow")).toEqual(once);
  });

  it("clears force even when pool empty", () => {
    const full = withForce("ghostSlow", ["powerPelletFreeze", "playerSpeedUp", "ghostSlow"]);
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
    expect(applyPowerPelletEffects(bare, 1)).toEqual(bare);

    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    const frozen = applyPowerPelletEffects(owned, 1);
    expect(frozen.freezeRemainingMs).toBe(FREEZE_MS);

    const partial = { ...frozen, freezeRemainingMs: 500 };
    expect(applyPowerPelletEffects(partial, 2).freezeRemainingMs).toBe(FREEZE_MS);
  });

  it("powerRemoved zero is a no-op", () => {
    const owned = grantUpgrade(createRunUpgrades(), "powerPelletFreeze");
    expect(applyPowerPelletEffects(owned, 0)).toEqual(owned);
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
    expect(upgradeLabels(["ghostSlow", "playerSpeedUp"])).toEqual(["Ghost Slow", "Speed Up"]);
  });
});
