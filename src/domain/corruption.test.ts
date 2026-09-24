import { describe, expect, it } from "vitest";
import { GHOST_KIND } from "./ghostKind";
import {
  CORRUPTION_MIN_LEVEL,
  SPEED_SURGE_ACTIVE_MS,
  SPEED_SURGE_CYCLE_MS,
  TELEGRAPH_FLASH_MS,
  createRunCorruption,
  isSpeedSurgeActive,
  maybeAssignCorruption,
  parseCorruptibleGhostKind,
  parseCorruptionId,
  parseForceCorruptionParams,
  resetCorruptionTransient,
  tickSpeedSurge,
} from "./corruption";

describe("maybeAssignCorruption", () => {
  it("does not assign below the minimum level", () => {
    const state = createRunCorruption({ type: null, ghostKind: null });
    const next = maybeAssignCorruption(state, CORRUPTION_MIN_LEVEL - 1, () => 0);
    expect(next.type).toBeNull();
    expect(next.ghostKind).toBeNull();
  });

  it("assigns once at the minimum level and never reassigns", () => {
    const state = createRunCorruption({ type: null, ghostKind: null });
    const assigned = maybeAssignCorruption(state, CORRUPTION_MIN_LEVEL, () => 0);
    expect(assigned.type).not.toBeNull();
    expect(assigned.ghostKind).not.toBeNull();

    const reassigned = maybeAssignCorruption(assigned, CORRUPTION_MIN_LEVEL + 3, () => 0.99);
    expect(reassigned).toEqual(assigned);
  });

  it("only ever assigns a non-Blinky kind", () => {
    const state = createRunCorruption({ type: null, ghostKind: null });
    for (const rng of [0, 0.33, 0.66, 0.99]) {
      const assigned = maybeAssignCorruption(state, CORRUPTION_MIN_LEVEL, () => rng);
      expect(assigned.ghostKind).not.toBe(GHOST_KIND.blinky);
    }
  });

  it("forced fields bypass the level gate", () => {
    const state = createRunCorruption({ type: "speedSurge", ghostKind: GHOST_KIND.clyde });
    const assigned = maybeAssignCorruption(state, 1, () => 0);
    expect(assigned).toMatchObject({ type: "speedSurge", ghostKind: GHOST_KIND.clyde });
  });

  it("picks the random ghost only from the present kinds", () => {
    const state = createRunCorruption({ type: "speedSurge", ghostKind: null });
    for (const rng of [0, 0.5, 0.99]) {
      const assigned = maybeAssignCorruption(state, 1, () => rng, [GHOST_KIND.pinky]);
      expect(assigned.ghostKind).toBe(GHOST_KIND.pinky);
    }
  });

  it("assigns nothing when no corruptible kind is present", () => {
    const state = createRunCorruption({ type: "speedSurge", ghostKind: null });
    expect(maybeAssignCorruption(state, 1, () => 0, [GHOST_KIND.blinky])).toEqual(state);
  });
});

describe("resetCorruptionTransient", () => {
  it("clears timers and trails but keeps the assignment", () => {
    const assigned = maybeAssignCorruption(
      createRunCorruption({ type: "slimeTrail", ghostKind: GHOST_KIND.pinky }),
      1,
      () => 0,
    );
    const dirty = {
      ...assigned,
      speedSurgeCycleMs: 500,
      wallPhaseCycleMs: 100,
      wallPhaseFlashMs: 50,
      wallPhasePendingTarget: { col: 1, row: 1 },
      invisibilityCycleMs: 900,
      pelletDropperCycleMs: 200,
      pelletDropperFlashMs: 50,
      pelletDropperDropsLeft: 2,
      trail: [{ col: 1, row: 1 }],
      pelletDropperLastTile: { col: 2, row: 2 },
    };

    const reset = resetCorruptionTransient(dirty);
    expect(reset.type).toBe("slimeTrail");
    expect(reset.ghostKind).toBe(GHOST_KIND.pinky);
    expect(reset.speedSurgeCycleMs).toBe(0);
    expect(reset.wallPhaseCycleMs).toBe(0);
    expect(reset.wallPhaseFlashMs).toBe(0);
    expect(reset.wallPhasePendingTarget).toBeNull();
    expect(reset.invisibilityCycleMs).toBe(0);
    expect(reset.pelletDropperCycleMs).toBe(0);
    expect(reset.pelletDropperFlashMs).toBe(0);
    expect(reset.pelletDropperDropsLeft).toBe(0);
    expect(reset.trail).toEqual([]);
    expect(reset.pelletDropperLastTile).toBeNull();
  });
});

describe("tickSpeedSurge / isSpeedSurgeActive", () => {
  it("no-ops for a different corruption type", () => {
    const state = createRunCorruption({ type: "slimeTrail", ghostKind: GHOST_KIND.pinky });
    expect(tickSpeedSurge(state, 100)).toBe(state);
    expect(isSpeedSurgeActive(state)).toBe(false);
  });

  it("flashes first, then is active for the burst window, then goes idle", () => {
    const base = maybeAssignCorruption(
      createRunCorruption({ type: "speedSurge", ghostKind: GHOST_KIND.inky }),
      1,
      () => 0,
    );

    const duringFlash = tickSpeedSurge(base, TELEGRAPH_FLASH_MS - 1);
    expect(isSpeedSurgeActive(duringFlash)).toBe(false);

    const justActive = tickSpeedSurge(base, TELEGRAPH_FLASH_MS + 1);
    expect(isSpeedSurgeActive(justActive)).toBe(true);

    const stillActive = tickSpeedSurge(base, TELEGRAPH_FLASH_MS + SPEED_SURGE_ACTIVE_MS - 1);
    expect(isSpeedSurgeActive(stillActive)).toBe(true);

    const idle = tickSpeedSurge(base, TELEGRAPH_FLASH_MS + SPEED_SURGE_ACTIVE_MS + 1);
    expect(isSpeedSurgeActive(idle)).toBe(false);

    const wrapped = tickSpeedSurge(base, SPEED_SURGE_CYCLE_MS + TELEGRAPH_FLASH_MS + 1);
    expect(isSpeedSurgeActive(wrapped)).toBe(true);
  });
});

describe("parseCorruptionId / parseCorruptibleGhostKind", () => {
  it("accepts a known id and rejects unknown values", () => {
    expect(parseCorruptionId("speedSurge")).toBe("speedSurge");
    expect(parseCorruptionId("nonsense")).toBeNull();
    expect(parseCorruptionId(null)).toBeNull();
  });

  it("accepts pinky/inky/clyde and rejects blinky", () => {
    expect(parseCorruptibleGhostKind("pinky")).toBe(GHOST_KIND.pinky);
    expect(parseCorruptibleGhostKind("blinky")).toBeNull();
    expect(parseCorruptibleGhostKind("nonsense")).toBeNull();
  });
});

describe("parseForceCorruptionParams", () => {
  it("reads both flags from the query string", () => {
    const params = new URLSearchParams("forceCorruption=wallPhaseDash&forceCorruptionGhost=clyde");
    expect(parseForceCorruptionParams(params)).toEqual({
      type: "wallPhaseDash",
      ghostKind: GHOST_KIND.clyde,
    });
  });

  it("defaults missing/invalid values to null", () => {
    const params = new URLSearchParams("forceCorruptionGhost=blinky");
    expect(parseForceCorruptionParams(params)).toEqual({ type: null, ghostKind: null });
  });
});
