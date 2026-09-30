import {
  BASE_FEAST_FRUIT_SPAWN_THRESHOLDS,
  BASE_FRUIT_SPAWN_THRESHOLDS,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
} from "./maze";

export type FruitKind =
  "cherries" | "strawberry" | "peach" | "apple" | "grapes" | "galaxian" | "bell" | "key";

export type FruitLevelSpec = {
  kind: FruitKind;
};

export const FRUIT_BY_LEVEL: readonly FruitLevelSpec[] = [
  { kind: "cherries" },
  { kind: "strawberry" },
  { kind: "peach" },
  { kind: "peach" },
  { kind: "apple" },
  { kind: "apple" },
  { kind: "grapes" },
  { kind: "grapes" },
  { kind: "galaxian" },
  { kind: "galaxian" },
  { kind: "bell" },
  { kind: "bell" },
  { kind: "key" },
];

export const FRUIT_LIFETIME_MS = 10_000;
export const FRUIT_FEAST_GAP_MS = 5_000;

export const CURRENT_LEVEL = 1;

const FRUIT_ART_BY_KIND: Partial<Record<FruitKind, string>> = {
  cherries: "art/other/strawberry.png",
  strawberry: "art/other/strawberry.png",
  apple: "art/other/apple.png",
};

export function fruitSpecForLevel(level: number): FruitLevelSpec {
  if (level < 1) {
    return FRUIT_BY_LEVEL[0]!;
  }
  const index = Math.min(level, FRUIT_BY_LEVEL.length) - 1;
  return FRUIT_BY_LEVEL[index]!;
}

export function fruitArtPath(kind: FruitKind): string {
  return FRUIT_ART_BY_KIND[kind] ?? "art/other/apple.png";
}

export function fruitSpawnCenter(): { x: number; y: number } {
  const { fruitSpawn } = getActiveLayout();
  return {
    x: cellCenterX(fruitSpawn.col),
    y: cellCenterY(fruitSpawn.row),
  };
}

export type FruitPresenceAction = "none" | "spawn" | "replace" | "despawn";

export type FruitPresence = {
  nextThresholdIndex: number;
  active: boolean;
  remainingMs: number;
  gapMs: number;
};

export type FruitPresenceTick = {
  state: FruitPresence;
  action: FruitPresenceAction;
};

export function createFruitPresence(): FruitPresence {
  return {
    nextThresholdIndex: 0,
    active: false,
    remainingMs: 0,
    gapMs: FRUIT_FEAST_GAP_MS,
  };
}

export function markFruitCollected(state: FruitPresence): FruitPresence {
  if (!state.active) {
    return state;
  }
  return {
    ...state,
    active: false,
    remainingMs: 0,
    gapMs: 0,
  };
}

export function extendFruitLifetime(state: FruitPresence, mul: number): FruitPresence {
  if (!state.active) {
    return state;
  }
  return { ...state, remainingMs: state.remainingMs * mul };
}

export function tickFruitPresence(
  state: FruitPresence,
  collectedCount: number,
  deltaMs: number,
  levelIndex: number,
  feast = false,
  lifetimeMul = 1,
): FruitPresenceTick {
  if (feast) {
    return tickFeastFruitPresence(state, collectedCount, deltaMs, levelIndex, lifetimeMul);
  }
  let next = state;
  let action: FruitPresenceAction = "none";

  // Level 1's mazeSmall is smaller than the maze1 baseline the layout-scaled
  // thresholds are derived from, so it keeps a single unscaled threshold
  // instead of the scaled two-fruit schedule used from level 2 on.
  const thresholds =
    levelIndex <= 1 ? [BASE_FRUIT_SPAWN_THRESHOLDS[0]] : getActiveLayout().fruitThresholds;
  while (
    next.nextThresholdIndex < thresholds.length &&
    collectedCount >= thresholds[next.nextThresholdIndex]!
  ) {
    const wasActive = next.active;
    next = {
      ...next,
      nextThresholdIndex: next.nextThresholdIndex + 1,
      active: true,
      remainingMs: FRUIT_LIFETIME_MS * lifetimeMul,
    };
    action = wasActive ? "replace" : "spawn";
  }

  if (!next.active) {
    return { state: next, action };
  }

  if (action === "spawn" || action === "replace") {
    return { state: next, action };
  }

  const remainingMs = Math.max(0, next.remainingMs - Math.max(0, deltaMs));
  if (remainingMs <= 0) {
    return {
      state: {
        ...next,
        active: false,
        remainingMs: 0,
      },
      action: "despawn",
    };
  }

  return {
    state: {
      ...next,
      remainingMs,
    },
    action: "none",
  };
}

function tickFeastFruitPresence(
  state: FruitPresence,
  collectedCount: number,
  deltaMs: number,
  levelIndex: number,
  lifetimeMul: number,
): FruitPresenceTick {
  const thresholds =
    levelIndex <= 1 ? BASE_FEAST_FRUIT_SPAWN_THRESHOLDS : getActiveLayout().feastFruitThresholds;
  const dt = Math.max(0, deltaMs);

  if (state.active) {
    const remainingMs = Math.max(0, state.remainingMs - dt);
    if (remainingMs <= 0) {
      return { state: { ...state, active: false, remainingMs: 0, gapMs: 0 }, action: "despawn" };
    }
    return { state: { ...state, remainingMs }, action: "none" };
  }

  const gapMs = state.gapMs + dt;
  const threshold = thresholds[state.nextThresholdIndex];
  if (threshold !== undefined && collectedCount >= threshold && gapMs >= FRUIT_FEAST_GAP_MS) {
    return {
      state: {
        nextThresholdIndex: state.nextThresholdIndex + 1,
        active: true,
        remainingMs: FRUIT_LIFETIME_MS * lifetimeMul,
        gapMs: 0,
      },
      action: "spawn",
    };
  }
  return { state: { ...state, gapMs }, action: "none" };
}
