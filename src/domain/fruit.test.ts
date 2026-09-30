import { describe, expect, it } from "vitest";
import { cellCenterX, cellCenterY, getActiveLayout, isWalkable } from "./maze";
import {
  CURRENT_LEVEL,
  FRUIT_FEAST_GAP_MS,
  FRUIT_LIFETIME_MS,
  createFruitPresence,
  fruitArtPath,
  fruitSpawnCenter,
  fruitSpecForLevel,
  markFruitCollected,
  tickFruitPresence,
} from "./fruit";

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

  it("spawns at 60, 130 and 200 when each fruit is gone for the gap", () => {
    let state = createFruitPresence();
    expect(tickFruitPresence(state, 59, 16, level, true).action).toBe("none");

    for (const threshold of [60, 130, 200]) {
      const spawn = tickFruitPresence(state, threshold, 16, level, true);
      expect(spawn.action).toBe("spawn");
      state = markFruitCollected(spawn.state);
      state = tickFruitPresence(state, threshold, FRUIT_FEAST_GAP_MS, level, true).state;
    }
    expect(state.nextThresholdIndex).toBe(3);
    expect(tickFruitPresence(state, 999, 16, level, true).action).toBe("none");
  });

  it("does not replace an active fruit and waits the gap after it is gone", () => {
    let { state } = tickFruitPresence(createFruitPresence(), 60, 0, level, true);
    const held = tickFruitPresence(state, 130, 3_000, level, true);
    expect(held.action).toBe("none");
    expect(held.state.nextThresholdIndex).toBe(1);

    const expired = tickFruitPresence(held.state, 130, FRUIT_LIFETIME_MS, level, true);
    expect(expired.action).toBe("despawn");
    state = expired.state;

    const early = tickFruitPresence(state, 130, FRUIT_FEAST_GAP_MS - 1, level, true);
    expect(early.action).toBe("none");
    const due = tickFruitPresence(early.state, 130, 1, level, true);
    expect(due.action).toBe("spawn");
    expect(due.state.nextThresholdIndex).toBe(2);
  });

  it("waits the gap after a fruit is collected", () => {
    const first = tickFruitPresence(createFruitPresence(), 60, 0, level, true);
    const collected = markFruitCollected(first.state);
    expect(tickFruitPresence(collected, 130, FRUIT_FEAST_GAP_MS - 1, level, true).action).toBe(
      "none",
    );
    expect(tickFruitPresence(collected, 130, FRUIT_FEAST_GAP_MS, level, true).action).toBe("spawn");
  });

  it("keeps the two-fruit schedule without the upgrade", () => {
    expect(tickFruitPresence(createFruitPresence(), 60, 16, level).action).toBe("none");
  });
});
