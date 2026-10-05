import { describe, expect, it } from "vitest";
import {
  BOSS_DEFS,
  bossGhostKind,
  bossStartGhosts,
  createBossState,
  isBossLevel,
  maxBossGhosts,
  parseBossParam,
  pickBoss,
  recordBossPelletsEaten,
  splitBossGhosts,
} from "./bossRules";
import { GHOST_KIND } from "./ghostKind";
import { DEFAULT_TUNING } from "./tuning";

const def = BOSS_DEFS.blinkySwarm;
const chained = BOSS_DEFS.chainedGhosts;

describe("isBossLevel", () => {
  it("makes level 9 the boss level and every other level a regular board", () => {
    expect(isBossLevel(9)).toBe(true);
    for (const level of [1, 2, 3, 4, 5, 6, 7, 8, 10]) {
      expect(isBossLevel(level)).toBe(false);
    }
  });
});

describe("pickBoss", () => {
  it("picks either boss from the roll", () => {
    expect(pickBoss(null, () => 0).id).toBe("blinkySwarm");
    expect(pickBoss(null, () => 0.99).id).toBe("chainedGhosts");
  });

  it("uses the forced boss without rolling", () => {
    const roll = () => {
      throw new Error("rolled");
    };
    expect(pickBoss("chainedGhosts", roll).id).toBe("chainedGhosts");
    expect(pickBoss("blinkySwarm", roll).id).toBe("blinkySwarm");
  });
});

describe("parseBossParam", () => {
  it("accepts the boss ids", () => {
    expect(parseBossParam(new URLSearchParams("boss=blinkySwarm"))).toBe("blinkySwarm");
    expect(parseBossParam(new URLSearchParams("boss=chainedGhosts"))).toBe("chainedGhosts");
  });

  it("rejects missing and unknown values", () => {
    for (const query of ["", "boss=", "boss=doubleBlinky", "boss=BLINKYSWARM"]) {
      expect(parseBossParam(new URLSearchParams(query))).toBeNull();
    }
  });
});

describe("Blinky Swarm", () => {
  it("starts with 2 Blinkys and ends at 10 after all 8 boss pellets", () => {
    expect(bossGhostKind(def, 0)).toBe(GHOST_KIND.blinky);
    expect(bossGhostKind(def, 9)).toBe(GHOST_KIND.blinky);
    expect(def.startGhosts).toBe(2);
    expect(def.spawnPellets).toBe(8);
    expect(maxBossGhosts(def)).toBe(10);
  });

  it("takes its start count from the knob, clamped to 2..10", () => {
    expect(bossStartGhosts(def)).toBe(2);
    expect(bossStartGhosts(def, { ...DEFAULT_TUNING, bossSwarmStartGhosts: 7 })).toBe(7);
    expect(bossStartGhosts(def, { ...DEFAULT_TUNING, bossSwarmStartGhosts: 40 })).toBe(10);
  });
});

describe("Chained Ghosts", () => {
  it("is Blinky and Clyde, chained, with no boss pellets and no growth", () => {
    expect([bossGhostKind(chained, 0), bossGhostKind(chained, 1)]).toEqual([
      GHOST_KIND.blinky,
      GHOST_KIND.clyde,
    ]);
    expect(chained.chained).toBe(true);
    expect(chained.ghostsBlock).toBe(false);
    expect(maxBossGhosts(chained)).toBe(2);
    expect(splitBossGhosts(chained, 2)).toEqual({ house: 2, tunnel: 0 });
  });

  it("ignores the swarm start knob", () => {
    expect(bossStartGhosts(chained, { ...DEFAULT_TUNING, bossSwarmStartGhosts: 7 })).toBe(2);
  });
});

describe("splitBossGhosts", () => {
  it("fills up to 4 house seats and sends the rest to the tunnels", () => {
    expect(splitBossGhosts(def, 2)).toEqual({ house: 2, tunnel: 0 });
    expect(splitBossGhosts(def, 4)).toEqual({ house: 4, tunnel: 0 });
    expect(splitBossGhosts(def, 10)).toEqual({ house: 4, tunnel: 6 });
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

  it("never grows past the boss max (e.g. a 10-Blinky knob start)", () => {
    const full = { ...createBossState(def, 10), bossPelletsRemaining: 8 };
    expect(recordBossPelletsEaten(full, 6)).toMatchObject({
      ghostCount: 10,
      pendingSpawns: 0,
      bossPelletsRemaining: 6,
    });
  });
});
