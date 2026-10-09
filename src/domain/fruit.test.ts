import { describe, expect, it } from "vitest";
import {
  BASE_FEAST_FRUIT_SPAWN_THRESHOLDS,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
} from "./maze";
import {
  CURRENT_LEVEL,
  FRUIT_FEAST_GAP_MS,
  FRUIT_FLICKER_MS,
  FRUIT_LIFETIME_MS,
  fruitFlickerAlpha,
  extendFruitLifetime,
  createFruitPresence,
  fruitArtPath,
  fruitSpawnCenter,
  fruitStackCenter,
  fruitSpecForLevel,
  markFruitCollected,
  tickFruitPresence,
} from "./fruit";

const FEAST = BASE_FEAST_FRUIT_SPAWN_THRESHOLDS;

describe("fruitFlickerAlpha", () => {
  it("stays solid while plenty of time remains", () => {
    expect(fruitFlickerAlpha(FRUIT_LIFETIME_MS, 100)).toBe(1);
    expect(fruitFlickerAlpha(FRUIT_FLICKER_MS + 1, 100)).toBe(1);
  });

  it("blinks on and off in the final flicker window", () => {
    expect(fruitFlickerAlpha(FRUIT_FLICKER_MS, 0)).toBe(1);
    expect(fruitFlickerAlpha(FRUIT_FLICKER_MS, 100)).toBe(0);
    expect(fruitFlickerAlpha(500, 200)).toBe(1);
    expect(fruitFlickerAlpha(500, 300)).toBe(0);
  });

  it("is solid when no countdown is running", () => {
    expect(fruitFlickerAlpha(0, 100)).toBe(1);
  });
});

describe("fruitSpecForLevel", () => {
  it("returns cherries for level 1", () => {
    expect(fruitSpecForLevel(CURRENT_LEVEL)).toEqual({ kind: "cherries" });
  });

  it("returns Holenet symbols for later levels", () => {
    expect(fruitSpecForLevel(2).kind).toBe("strawberry");
    expect(fruitSpecForLevel(5).kind).toBe("apple");
    expect(fruitSpecForLevel(21).kind).toBe("key");
  });
});

describe("fruitArtPath", () => {
  it("uses strawberry art as cherries stand-in", () => {
    expect(fruitArtPath("cherries")).toBe("art/other/strawberry.png");
  });

  it("maps strawberry and apple kinds to existing art", () => {
    expect(fruitArtPath("strawberry")).toBe("art/other/strawberry.png");
    expect(fruitArtPath("apple")).toBe("art/other/apple.png");
    expect(fruitArtPath("key")).toBe("art/other/apple.png");
  });
});

describe("fruitSpawnCenter", () => {
  it("centers on the active layout fruit cell under the ghost house", () => {
    const { fruitSpawn, playerSolids } = getActiveLayout();
    expect(fruitSpawnCenter()).toEqual({
      x: cellCenterX(fruitSpawn.col),
      y: cellCenterY(fruitSpawn.row),
    });
    expect(isWalkable(fruitSpawn.col, fruitSpawn.row, playerSolids)).toBe(true);
  });
});

describe("tickFruitPresence", () => {
  const fruitLevel = 2;

  it("spawns once on level 1 after 70 pellets, with no second threshold", () => {
    const idle = createFruitPresence();
    expect(tickFruitPresence(idle, 69, 16, 1).action).toBe("none");

    const crossed = tickFruitPresence(idle, 70, 16, 1);
    expect(crossed.action).toBe("spawn");
    expect(crossed.state.active).toBe(true);
    expect(crossed.state.nextThresholdIndex).toBe(1);

    const after = tickFruitPresence(crossed.state, 170, 16, 1);
    expect(after.action).toBe("none");
  });

  it("spawns when collectedCount crosses 70", () => {
    const [firstThreshold] = getActiveLayout().fruitThresholds;
    const idle = createFruitPresence();
    expect(tickFruitPresence(idle, firstThreshold - 1, 16, fruitLevel).action).toBe("none");

    const crossed = tickFruitPresence(idle, firstThreshold, 16, fruitLevel);
    expect(crossed.action).toBe("spawn");
    expect(crossed.state.active).toBe(true);
    expect(crossed.state.remainingMs).toBe(FRUIT_LIFETIME_MS);
    expect(crossed.state.nextThresholdIndex).toBe(1);
  });

  it("expires after 10_000 ms of real delta, not countdown ticks", () => {
    const [firstThreshold] = getActiveLayout().fruitThresholds;
    const { state } = tickFruitPresence(createFruitPresence(), firstThreshold, 0, fruitLevel);
    expect(state.active).toBe(true);

    const mid = tickFruitPresence(state, firstThreshold, FRUIT_LIFETIME_MS - 1, fruitLevel);
    expect(mid.action).toBe("none");
    expect(mid.state.active).toBe(true);
    expect(mid.state.remainingMs).toBe(1);

    const end = tickFruitPresence(mid.state, firstThreshold, 1, fruitLevel);
    expect(end.action).toBe("despawn");
    expect(end.state.active).toBe(false);
    expect(end.state.remainingMs).toBe(0);
  });

  it("does not treat run-clock 100ms ticks as fruit seconds", () => {
    const [firstThreshold] = getActiveLayout().fruitThresholds;
    let { state } = tickFruitPresence(createFruitPresence(), firstThreshold, 0, fruitLevel);
    for (let i = 0; i < 10; i += 1) {
      const tick = tickFruitPresence(state, firstThreshold, 100, fruitLevel);
      state = tick.state;
      expect(tick.action).toBe("none");
      expect(state.active).toBe(true);
    }
    expect(state.remainingMs).toBe(FRUIT_LIFETIME_MS - 1_000);
  });

  it("replaces when 170 fires while first fruit is still active", () => {
    const [firstThreshold, secondThreshold] = getActiveLayout().fruitThresholds;
    const first = tickFruitPresence(createFruitPresence(), firstThreshold, 0, fruitLevel);
    const aged = tickFruitPresence(first.state, firstThreshold + 30, 3_000, fruitLevel);
    expect(aged.state.active).toBe(true);

    const second = tickFruitPresence(aged.state, secondThreshold, 16, fruitLevel);
    expect(second.action).toBe("replace");
    expect(second.state.active).toBe(true);
    expect(second.state.remainingMs).toBe(FRUIT_LIFETIME_MS);
    expect(second.state.nextThresholdIndex).toBe(getActiveLayout().fruitThresholds.length);
  });

  it("spawns the second fruit after the first has despawned", () => {
    const [firstThreshold, secondThreshold] = getActiveLayout().fruitThresholds;
    let { state } = tickFruitPresence(createFruitPresence(), firstThreshold, 0, fruitLevel);
    state = tickFruitPresence(state, firstThreshold + 30, FRUIT_LIFETIME_MS, fruitLevel).state;
    expect(state.active).toBe(false);

    const second = tickFruitPresence(state, secondThreshold, 0, fruitLevel);
    expect(second.action).toBe("spawn");
    expect(second.state.active).toBe(true);
    expect(second.state.remainingMs).toBe(FRUIT_LIFETIME_MS);
  });

  it("doubles spawn, replace and active lifetimes with a lifetime multiplier", () => {
    const [firstThreshold, secondThreshold] = getActiveLayout().fruitThresholds;
    const first = tickFruitPresence(createFruitPresence(), firstThreshold, 0, fruitLevel, {
      lifetimeMul: 2,
    });
    expect(first.state.remainingMs).toBe(FRUIT_LIFETIME_MS * 2);

    const mid = tickFruitPresence(
      first.state,
      firstThreshold,
      FRUIT_LIFETIME_MS * 1.5,
      fruitLevel,
      { lifetimeMul: 2 },
    );
    expect(mid.state.active).toBe(true);
    const end = tickFruitPresence(mid.state, firstThreshold, FRUIT_LIFETIME_MS * 0.5, fruitLevel, {
      lifetimeMul: 2,
    });
    expect(end.action).toBe("despawn");

    const replaced = tickFruitPresence(first.state, secondThreshold, 16, fruitLevel, {
      lifetimeMul: 2,
    });
    expect(replaced.action).toBe("replace");
    expect(replaced.state.remainingMs).toBe(FRUIT_LIFETIME_MS * 2);
  });

  it("extendFruitLifetime scales active fruit and ignores inactive presence", () => {
    const idle = createFruitPresence();
    expect(extendFruitLifetime(idle, 2)).toBe(idle);
    const active = { ...idle, active: true, remainingMs: 6_000 };
    expect(extendFruitLifetime(active, 2).remainingMs).toBe(12_000);
  });

  it("does not re-fire a consumed threshold", () => {
    const [firstThreshold] = getActiveLayout().fruitThresholds;
    const first = tickFruitPresence(createFruitPresence(), firstThreshold, 0, fruitLevel);
    const again = tickFruitPresence(first.state, firstThreshold, 16, fruitLevel);
    expect(again.action).toBe("none");
    expect(again.state.nextThresholdIndex).toBe(1);
  });
});

describe("markFruitCollected", () => {
  it("clears active fruit without consuming the next threshold", () => {
    const [firstThreshold] = getActiveLayout().fruitThresholds;
    const spawned = tickFruitPresence(createFruitPresence(), firstThreshold, 0, 2).state;
    const cleared = markFruitCollected(spawned);
    expect(cleared.active).toBe(false);
    expect(cleared.nextThresholdIndex).toBe(1);
    expect(markFruitCollected(createFruitPresence())).toEqual(createFruitPresence());
  });
});

describe("tickFruitPresence with fruitFeast", () => {
  const level = 1;

  it("doubles feast fruit lifetime with a lifetime multiplier", () => {
    const { state } = tickFruitPresence(createFruitPresence(), 60, 16, level, {
      feastBase: FEAST,
      lifetimeMul: 2,
    });
    expect(state.remainingMs).toBe(FRUIT_LIFETIME_MS * 2);
  });

  it("spawns at 60, 130 and 200 when each fruit is gone for the gap", () => {
    let state = createFruitPresence();
    expect(tickFruitPresence(state, 59, 16, level, { feastBase: FEAST }).action).toBe("none");

    for (const threshold of [60, 130, 200]) {
      const spawn = tickFruitPresence(state, threshold, 16, level, { feastBase: FEAST });
      expect(spawn.action).toBe("spawn");
      state = markFruitCollected(spawn.state);
      state = tickFruitPresence(state, threshold, FRUIT_FEAST_GAP_MS, level, {
        feastBase: FEAST,
      }).state;
    }
    expect(state.nextThresholdIndex).toBe(3);
    expect(tickFruitPresence(state, 999, 16, level, { feastBase: FEAST }).action).toBe("none");
  });

  it("does not replace an active fruit and waits the gap after it is gone", () => {
    let { state } = tickFruitPresence(createFruitPresence(), 60, 0, level, { feastBase: FEAST });
    const held = tickFruitPresence(state, 130, 3_000, level, { feastBase: FEAST });
    expect(held.action).toBe("none");
    expect(held.state.nextThresholdIndex).toBe(1);

    const expired = tickFruitPresence(held.state, 130, FRUIT_LIFETIME_MS, level, {
      feastBase: FEAST,
    });
    expect(expired.action).toBe("despawn");
    state = expired.state;

    const early = tickFruitPresence(state, 130, FRUIT_FEAST_GAP_MS - 1, level, {
      feastBase: FEAST,
    });
    expect(early.action).toBe("none");
    const due = tickFruitPresence(early.state, 130, 1, level, { feastBase: FEAST });
    expect(due.action).toBe("spawn");
    expect(due.state.nextThresholdIndex).toBe(2);
  });

  it("waits the gap after a fruit is collected", () => {
    const first = tickFruitPresence(createFruitPresence(), 60, 0, level, { feastBase: FEAST });
    const collected = markFruitCollected(first.state);
    expect(
      tickFruitPresence(collected, 130, FRUIT_FEAST_GAP_MS - 1, level, { feastBase: FEAST }).action,
    ).toBe("none");
    expect(
      tickFruitPresence(collected, 130, FRUIT_FEAST_GAP_MS, level, { feastBase: FEAST }).action,
    ).toBe("spawn");
  });

  it("keeps the two-fruit schedule without the upgrade", () => {
    expect(tickFruitPresence(createFruitPresence(), 60, 16, level).action).toBe("none");
  });
});

describe("enhanced fruit presence", () => {
  const level = 2;

  it("Fecundity+ keeps fruit past the normal lifetime", () => {
    const [first] = getActiveLayout().fruitThresholds;
    const spawned = tickFruitPresence(createFruitPresence(), first, 0, level, { persist: true });
    const aged = tickFruitPresence(spawned.state, first, FRUIT_LIFETIME_MS * 5, level, {
      persist: true,
    });
    expect(aged.action).toBe("none");
    expect(aged.state.active).toBe(true);
  });

  it("Fecundity+ spawns the next fruit alongside an uncollected one", () => {
    const [first, second] = getActiveLayout().fruitThresholds;
    const options = { persist: true, stack: true };
    const one = tickFruitPresence(createFruitPresence(), first, 0, level, options);
    const two = tickFruitPresence(one.state, second, 16, level, options);
    expect(two.action).toBe("spawn");
    expect(two.state.active).toBe(true);
  });

  it("Feast+ uses four thresholds and stacks when persistent", () => {
    const base = [45, 100, 150, 200];
    const options = { feastBase: base, persist: true, stack: true };
    const scaled = tickFruitPresence(createFruitPresence(), 0, 0, 1, options);
    expect(scaled.action).toBe("none");
    let state = createFruitPresence();
    let spawns = 0;
    for (const threshold of base) {
      state = { ...state, gapMs: FRUIT_FEAST_GAP_MS };
      const tick = tickFruitPresence(state, threshold, 16, 1, options);
      if (tick.action === "spawn") {
        spawns += 1;
      }
      state = tick.state;
    }
    expect(spawns).toBe(4);
  });

  it("Feast+ without stacking still waits for the active fruit", () => {
    const options = { feastBase: [45, 100, 150, 200] };
    const first = tickFruitPresence(createFruitPresence(), 45, 16, 1, options);
    expect(first.action).toBe("spawn");
    expect(tickFruitPresence(first.state, 100, 16, 1, options).action).toBe("none");
  });

  it("keeps the presence active while other fruit remain after a pickup", () => {
    const [first] = getActiveLayout().fruitThresholds;
    const { state } = tickFruitPresence(createFruitPresence(), first, 0, level);
    expect(markFruitCollected(state, true).active).toBe(true);
    expect(markFruitCollected(state).active).toBe(false);
  });
});

describe("fruitStackCenter", () => {
  it("first fruit sits on the spawn cell, then alternates right and left in the same row", () => {
    const { fruitSpawn } = getActiveLayout();
    const first = fruitStackCenter([]);
    expect(first).toEqual({ x: cellCenterX(fruitSpawn.col), y: cellCenterY(fruitSpawn.row) });
    const second = fruitStackCenter([first!]);
    expect(second!.y).toBe(first!.y);
    expect(second!.x).not.toBe(first!.x);
    const third = fruitStackCenter([first!, second!]);
    expect(third!.y).toBe(first!.y);
    expect([first!.x, second!.x]).not.toContain(third!.x);
  });
});
