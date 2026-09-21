import { cellCenterX, cellCenterY, getActiveLayout } from "./maze";

export type FruitKind =
  "cherries" | "strawberry" | "peach" | "apple" | "grapes" | "galaxian" | "bell" | "key";

export type FruitLevelSpec = {
  kind: FruitKind;
  points: number;
};

export const FRUIT_BY_LEVEL: readonly FruitLevelSpec[] = [
  { kind: "cherries", points: 100 },
  { kind: "strawberry", points: 300 },
  { kind: "peach", points: 500 },
  { kind: "peach", points: 500 },
  { kind: "apple", points: 700 },
  { kind: "apple", points: 700 },
  { kind: "grapes", points: 1000 },
  { kind: "grapes", points: 1000 },
  { kind: "galaxian", points: 2000 },
  { kind: "galaxian", points: 2000 },
  { kind: "bell", points: 3000 },
  { kind: "bell", points: 3000 },
  { kind: "key", points: 5000 },
];

export const FRUIT_LIFETIME_MS = 10_000;

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
  };
}

export function tickFruitPresence(
  state: FruitPresence,
  collectedCount: number,
  deltaMs: number,
  levelIndex: number = CURRENT_LEVEL,
): FruitPresenceTick {
  let next = state;
  let action: FruitPresenceAction = "none";

  const thresholds = levelIndex <= 1 ? [] : getActiveLayout().fruitThresholds;
  while (
    next.nextThresholdIndex < thresholds.length &&
    collectedCount >= thresholds[next.nextThresholdIndex]!
  ) {
    const wasActive = next.active;
    next = {
      nextThresholdIndex: next.nextThresholdIndex + 1,
      active: true,
      remainingMs: FRUIT_LIFETIME_MS,
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
