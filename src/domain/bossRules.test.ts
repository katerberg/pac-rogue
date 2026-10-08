import { describe, expect, it } from "vitest";
import {
  advanceBossStage,
  BOSS_DEFS,
  bossGhostKind,
  bossStage,
  bossStageCount,
  bossStartGhosts,
  bossTimerLabel,
  chainPairForKind,
  CHAIN_PAIR,
  createBossState,
  invertRgb24,
  isBossLevel,
  isFinalBossStage,
  maxBossGhosts,
  parseBossParam,
  pickBoss,
  recordBossPelletsEaten,
  splitBossGhosts,
  totalBossSpawnPellets,
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
  it("starts with 2 Blinkys and ends at 10 after both stages of boss pellets", () => {
    expect(bossGhostKind(def, 0)).toBe(GHOST_KIND.blinky);
    expect(bossGhostKind(def, 9)).toBe(GHOST_KIND.blinky);
    expect(def.startGhosts).toBe(2);
    expect(bossStageCount(def)).toBe(2);
    expect(bossStage(def, 0)).toEqual({ spawnPellets: 3, chainPairs: [] });
    expect(bossStage(def, 1)).toEqual({ spawnPellets: 5, chainPairs: [] });
    expect(totalBossSpawnPellets(def)).toBe(8);
    expect(maxBossGhosts(def)).toBe(10);
  });

  it("takes its start count from the knob, clamped to 2..10", () => {
    expect(bossStartGhosts(def)).toBe(2);
    expect(bossStartGhosts(def, { ...DEFAULT_TUNING, bossSwarmStartGhosts: 7 })).toBe(7);
    expect(bossStartGhosts(def, { ...DEFAULT_TUNING, bossSwarmStartGhosts: 40 })).toBe(10);
  });
});

describe("Chained Ghosts", () => {
  it("is the full roster with staged chain pairs and no boss pellets", () => {
    expect([0, 1, 2, 3].map((i) => bossGhostKind(chained, i))).toEqual([
      GHOST_KIND.blinky,
      GHOST_KIND.pinky,
      GHOST_KIND.inky,
      GHOST_KIND.clyde,
    ]);
    expect(chained.chained).toBe(true);
    expect(maxBossGhosts(chained)).toBe(4);
    expect(splitBossGhosts(chained, 4)).toEqual({ house: 4, tunnel: 0 });
    expect(bossStage(chained, 0).chainPairs).toEqual([CHAIN_PAIR.blinkyClyde]);
    expect(bossStage(chained, 1).chainPairs).toEqual([
      CHAIN_PAIR.blinkyClyde,
      CHAIN_PAIR.pinkyInky,
    ]);
  });

  it("ignores the swarm start knob", () => {
    expect(bossStartGhosts(chained, { ...DEFAULT_TUNING, bossSwarmStartGhosts: 7 })).toBe(4);
  });
});

describe("chainPairForKind", () => {
  it("maps Blinky/Clyde and Pinky/Inky to the two lightning pairs", () => {
    expect(chainPairForKind(GHOST_KIND.blinky)).toBe(CHAIN_PAIR.blinkyClyde);
    expect(chainPairForKind(GHOST_KIND.clyde)).toBe(CHAIN_PAIR.blinkyClyde);
    expect(chainPairForKind(GHOST_KIND.pinky)).toBe(CHAIN_PAIR.pinkyInky);
    expect(chainPairForKind(GHOST_KIND.inky)).toBe(CHAIN_PAIR.pinkyInky);
  });
});

describe("splitBossGhosts", () => {
  it("fills up to 4 house seats and sends the rest to the tunnels", () => {
    expect(splitBossGhosts(def, 2)).toEqual({ house: 2, tunnel: 0 });
    expect(splitBossGhosts(def, 4)).toEqual({ house: 4, tunnel: 0 });
    expect(splitBossGhosts(def, 10)).toEqual({ house: 4, tunnel: 6 });
  });
});

describe("boss stages", () => {
  it("advances to stage 2 and inverts the maze color once", () => {
    const start = createBossState(def, 2);
    expect(isFinalBossStage(start)).toBe(false);
    expect(start.stageIndex).toBe(0);
    expect(start.mazeColorInverted).toBe(false);

    const next = advanceBossStage(start);
    expect(next.stageIndex).toBe(1);
    expect(next.mazeColorInverted).toBe(true);
    expect(isFinalBossStage(next)).toBe(true);
    expect(advanceBossStage(next)).toBe(next);
  });

  it("inverts 24-bit RGB with XOR white", () => {
    expect(invertRgb24(0x000000)).toBe(0xffffff);
    expect(invertRgb24(0xffffff)).toBe(0x000000);
    expect(invertRgb24(0x123456)).toBe(0xedcba9);
  });

  it("formats the broken timer as Time: 888 while glitching", () => {
    expect(bossTimerLabel(true, 42)).toBe("Time: 888");
    expect(bossTimerLabel(false, 42)).toBe("Time: 42");
  });
});

describe("recordBossPelletsEaten", () => {
  it("adds one pending Blinky per boss pellet eaten in stage 1", () => {
    let state = { ...createBossState(def, 2), bossPelletsRemaining: 3 };
    for (let remaining = 2; remaining >= 0; remaining -= 1) {
      state = recordBossPelletsEaten(state, remaining);
    }
    expect(state.ghostCount).toBe(5);
    expect(state.pendingSpawns).toBe(3);
    expect(state.bossPelletsRemaining).toBe(0);
  });

  it("handles several pellets eaten in one frame and no-ops when none were", () => {
    const start = { ...createBossState(def, 2), bossPelletsRemaining: 3 };
    expect(recordBossPelletsEaten(start, 3)).toBe(start);
    expect(recordBossPelletsEaten(start, 1)).toMatchObject({ ghostCount: 4, pendingSpawns: 2 });
  });

  it("never grows past the boss max (e.g. a 10-Blinky knob start)", () => {
    const full = { ...createBossState(def, 10), bossPelletsRemaining: 3 };
    expect(recordBossPelletsEaten(full, 1)).toMatchObject({
      ghostCount: 10,
      pendingSpawns: 0,
      bossPelletsRemaining: 1,
    });
  });
});
