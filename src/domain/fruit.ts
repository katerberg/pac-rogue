import { DEFAULT_TUNING, type Tuning } from "./tuning";
import {
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  scaleFeastThresholds,
  worldToCol,
  worldToRow,
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

export const FRUIT_LIFETIME_MS = DEFAULT_TUNING.fruitLifetimeMs;
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

export function fruitStackCenter(
  occupied: readonly { x: number; y: number }[],
): { x: number; y: number } | null {
  const { fruitSpawn, playerSolids, cols } = getActiveLayout();
  const taken = new Set(occupied.map((pos) => `${worldToCol(pos.x)},${worldToRow(pos.y)}`));
  for (let offset = 0; offset < cols; offset += 1) {
    for (const col of offset === 0
      ? [fruitSpawn.col]
      : [fruitSpawn.col + offset, fruitSpawn.col - offset]) {
      if (
        col >= 0 &&
        col < cols &&
        isWalkable(col, fruitSpawn.row, playerSolids) &&
        !taken.has(`${col},${fruitSpawn.row}`)
      ) {
        return { x: cellCenterX(col), y: cellCenterY(fruitSpawn.row) };
      }
    }
  }
  return null;
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

export function markFruitCollected(state: FruitPresence, othersRemain = false): FruitPresence {
  if (!state.active || othersRemain) {
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

export type FruitTickOptions = {
  feastBase?: readonly number[] | null;
  lifetimeMul?: number;
  persist?: boolean;
  stack?: boolean;
  tuning?: Tuning;
};

export function tickFruitPresence(
  state: FruitPresence,
  collectedCount: number,
  deltaMs: number,
  levelIndex: number,
  options: FruitTickOptions = {},
): FruitPresenceTick {
  const {
    feastBase = null,
    lifetimeMul = 1,
    persist = false,
    stack = false,
    tuning = DEFAULT_TUNING,
  } = options;
  if (feastBase !== null) {
    return tickFeastFruitPresence(state, collectedCount, deltaMs, levelIndex, {
      feastBase,
      lifetimeMul,
      persist,
      stack,
      tuning,
    });
  }
  let next = state;
  let action: FruitPresenceAction = "none";

  // Level 1's mazeSmall is smaller than the maze1 baseline the layout-scaled
  // thresholds are derived from, so it keeps a single unscaled threshold
  // instead of the scaled two-fruit schedule used from level 2 on.
  const thresholds =
    levelIndex <= 1
      ? [tuning.fruitThreshold1]
      : tuning === DEFAULT_TUNING
        ? getActiveLayout().fruitThresholds
        : scaleFeastThresholds([tuning.fruitThreshold1, tuning.fruitThreshold2]);
  while (
    next.nextThresholdIndex < thresholds.length &&
    collectedCount >= thresholds[next.nextThresholdIndex]!
  ) {
    const wasActive = next.active;
    next = {
      ...next,
      nextThresholdIndex: next.nextThresholdIndex + 1,
      active: true,
      remainingMs: tuning.fruitLifetimeMs * lifetimeMul,
    };
    action = wasActive && !stack ? "replace" : "spawn";
  }

  if (!next.active) {
    return { state: next, action };
  }

  if (action === "spawn" || action === "replace" || persist) {
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
  options: Required<Omit<FruitTickOptions, "feastBase">> & { feastBase: readonly number[] },
): FruitPresenceTick {
  const { feastBase, lifetimeMul, persist, stack, tuning } = options;
  const thresholds = levelIndex <= 1 ? feastBase : scaleFeastThresholds(feastBase);
  const dt = Math.max(0, deltaMs);

  let current = state;
  if (current.active && !persist) {
    const remainingMs = Math.max(0, current.remainingMs - dt);
    if (remainingMs <= 0) {
      return { state: { ...current, active: false, remainingMs: 0, gapMs: 0 }, action: "despawn" };
    }
    current = { ...current, remainingMs };
  }
  if (current.active && !stack) {
    return { state: current, action: "none" };
  }

  const gapMs = current.gapMs + dt;
  const threshold = thresholds[current.nextThresholdIndex];
  if (threshold !== undefined && collectedCount >= threshold && gapMs >= FRUIT_FEAST_GAP_MS) {
    return {
      state: {
        nextThresholdIndex: current.nextThresholdIndex + 1,
        active: true,
        remainingMs: tuning.fruitLifetimeMs * lifetimeMul,
        gapMs: 0,
      },
      action: "spawn",
    };
  }
  return { state: { ...current, gapMs }, action: "none" };
}
