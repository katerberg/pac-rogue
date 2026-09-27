import { describe, expect, it } from "vitest";
import {
  BOSS_DEFS,
  bossForLevel,
  createBossState,
  maxBossGhosts,
  parseBossGhostsParam,
  recordBossPelletsEaten,
  splitBossGhosts,
} from "./bossRules";
import { GHOST_KIND } from "./ghostKind";

const def = BOSS_DEFS.doubleBlinky;

describe("bossForLevel", () => {
  it("makes level 9 the Double Blinky boss and every other level a regular board", () => {
    expect(bossForLevel(9)?.id).toBe("doubleBlinky");
    for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 10]) {
      expect(bossForLevel(level)).toBeNull();
    }
  });

  it("starts with 2 Blinkys and ends at 10 after all 8 boss pellets", () => {
    expect(def.ghostKind).toBe(GHOST_KIND.blinky);
    expect(def.startGhosts).toBe(2);
    expect(def.spawnPellets).toBe(8);
    expect(maxBossGhosts(def)).toBe(10);
  });
});

describe("splitBossGhosts", () => {
  it("fills up to 4 house seats and sends the rest to the tunnels", () => {
    expect(splitBossGhosts(def, 2)).toEqual({ house: 2, tunnel: 0 });
    expect(splitBossGhosts(def, 4)).toEqual({ house: 4, tunnel: 0 });
    expect(splitBossGhosts(def, 10)).toEqual({ house: 4, tunnel: 6 });
  });
});

describe("parseBossGhostsParam", () => {
  it("accepts 2..10", () => {
    expect(parseBossGhostsParam(new URLSearchParams("bossGhosts=2"), def)).toBe(2);
    expect(parseBossGhostsParam(new URLSearchParams("bossGhosts=10"), def)).toBe(10);
  });

  it("rejects missing, out-of-range, and non-numeric values", () => {
    for (const query of ["", "bossGhosts=", "bossGhosts=1", "bossGhosts=11", "bossGhosts=x"]) {
      expect(parseBossGhostsParam(new URLSearchParams(query), def)).toBeNull();
    }
  });
});

describe("recordBossPelletsEaten", () => {
  it("adds one pending Blinky per boss pellet eaten, reaching 10 after all 8", () => {
    let state = { ...createBossState(def, 2), bossPelletsRemaining: 8 };
    for (let remaining = 7; remaining >= 0; remaining -= 1) {
      state = recordBossPelletsEaten(state, remaining);
    }
    expect(state.ghostCount).toBe(10);
    expect(state.pendingSpawns).toBe(8);
    expect(state.bossPelletsRemaining).toBe(0);
  });

  it("handles several pellets eaten in one frame and no-ops when none were", () => {
    const start = { ...createBossState(def, 2), bossPelletsRemaining: 8 };
    expect(recordBossPelletsEaten(start, 8)).toBe(start);
    expect(recordBossPelletsEaten(start, 5)).toMatchObject({ ghostCount: 5, pendingSpawns: 3 });
  });

  it("never grows past the boss max (e.g. a ?bossGhosts=10 start)", () => {
    const full = { ...createBossState(def, 10), bossPelletsRemaining: 8 };
    expect(recordBossPelletsEaten(full, 6)).toMatchObject({
      ghostCount: 10,
      pendingSpawns: 0,
      bossPelletsRemaining: 6,
    });
  });
});
