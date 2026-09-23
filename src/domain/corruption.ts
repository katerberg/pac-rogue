import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import type { GhostTarget } from "./ghostTarget";

export type CorruptionId =
  | "slimeTrail"
  | "invisibility"
  | "freeRetargetReverse"
  | "speedSurge"
  | "wallPhaseDash"
  | "pelletDropper"
  | "falseScatter";

export type CorruptionDef = {
  id: CorruptionId;
  label: string;
  description: string;
};

export const CORRUPTION_DEFS: readonly CorruptionDef[] = [
  {
    id: "slimeTrail",
    label: "Slime Trail",
    description: "Leaves a lethal 7-tile slime trail behind it.",
  },
  {
    id: "invisibility",
    label: "Invisibility",
    description: "Fades out for 3 of every 10 seconds; reveals itself near the player.",
  },
  {
    id: "freeRetargetReverse",
    label: "Free-Retarget Reverse",
    description: "Re-targets constantly and can reverse direction at will.",
  },
  {
    id: "speedSurge",
    label: "Speed Surge",
    description: "Periodically bursts to much higher speed.",
  },
  {
    id: "wallPhaseDash",
    label: "Wall-Phase Dash",
    description: "Periodically lunges two tiles through a thin wall.",
  },
  {
    id: "pelletDropper",
    label: "Pellet Dropper",
    description: "Drops extra pellets behind itself that must be cleared.",
  },
  {
    id: "falseScatter",
    label: "False Scatter",
    description: "Never scatters; stays in chase mode permanently.",
  },
];

export const CORRUPTION_IDS: readonly CorruptionId[] = CORRUPTION_DEFS.map((def) => def.id);

const CORRUPTIBLE_GHOST_KINDS: readonly GhostKindId[] = [
  GHOST_KIND.pinky,
  GHOST_KIND.inky,
  GHOST_KIND.clyde,
];

export const OUTLINE_TINT_BY_CORRUPTION: Record<CorruptionId, number> = {
  slimeTrail: 0x66ff33,
  invisibility: 0x9933ff,
  freeRetargetReverse: 0xff3399,
  speedSurge: 0xff6600,
  wallPhaseDash: 0x33ffff,
  pelletDropper: 0xffff33,
  falseScatter: 0xff0000,
};

export const FLASH_TINT = 0xffffff;
export const TELEGRAPH_FLASH_MS = 400;

export const CORRUPTION_MIN_LEVEL = 4;

export const SLIME_TRAIL_MAX_LEN = 7;

export const PELLET_DROPPER_COUNT = 3;
export const PELLET_DROPPER_INTERVAL_MS = 10_000;

export const SPEED_SURGE_MUL = 1.6;
export const SPEED_SURGE_ACTIVE_MS = 1_500;
export const SPEED_SURGE_CYCLE_MS = 8_000;

export const WALL_PHASE_CYCLE_MS = 9_000;

export const INVISIBILITY_CYCLE_MS = 10_000;
export const INVISIBILITY_HIDDEN_MS = 3_000;
export const INVISIBILITY_REVEAL_RADIUS_TILES = 2;

export type RunCorruption = {
  ghostKind: GhostKindId | null;
  type: CorruptionId | null;
  forcedType: CorruptionId | null;
  forcedGhostKind: GhostKindId | null;
  speedSurgeCycleMs: number;
  wallPhaseCycleMs: number;
  wallPhaseFlashMs: number;
  wallPhasePendingTarget: GhostTarget | null;
  invisibilityCycleMs: number;
  pelletDropperCycleMs: number;
  pelletDropperFlashMs: number;
  pelletDropperDropsLeft: number;
  trail: GhostTarget[];
  pelletDropperLastTile: GhostTarget | null;
};

export type ForcedCorruption = {
  type: CorruptionId | null;
  ghostKind: GhostKindId | null;
};

export function createRunCorruption(forced: ForcedCorruption): RunCorruption {
  return {
    ghostKind: null,
    type: null,
    forcedType: forced.type,
    forcedGhostKind: forced.ghostKind,
    speedSurgeCycleMs: 0,
    wallPhaseCycleMs: 0,
    wallPhaseFlashMs: 0,
    wallPhasePendingTarget: null,
    invisibilityCycleMs: 0,
    pelletDropperCycleMs: 0,
    pelletDropperFlashMs: 0,
    pelletDropperDropsLeft: 0,
    trail: [],
    pelletDropperLastTile: null,
  };
}

export function parseCorruptionId(raw: string | null): CorruptionId | null {
  if (raw === null) {
    return null;
  }
  return CORRUPTION_IDS.includes(raw as CorruptionId) ? (raw as CorruptionId) : null;
}

const GHOST_KIND_BY_NAME: Record<string, GhostKindId> = {
  pinky: GHOST_KIND.pinky,
  inky: GHOST_KIND.inky,
  clyde: GHOST_KIND.clyde,
};

export function parseCorruptibleGhostKind(raw: string | null): GhostKindId | null {
  if (raw === null) {
    return null;
  }
  return GHOST_KIND_BY_NAME[raw] ?? null;
}

export function parseForceCorruptionParams(params: URLSearchParams): ForcedCorruption {
  return {
    type: parseCorruptionId(params.get("forceCorruption")),
    ghostKind: parseCorruptibleGhostKind(params.get("forceCorruptionGhost")),
  };
}

function takeRandom<T>(pool: readonly T[], rng: () => number): T {
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[index]!;
}

export function maybeAssignCorruption(
  state: RunCorruption,
  levelIndex: number,
  rng: () => number,
  presentKinds: readonly GhostKindId[] = CORRUPTIBLE_GHOST_KINDS,
): RunCorruption {
  if (state.type !== null) {
    return state;
  }
  if (state.forcedType === null && levelIndex < CORRUPTION_MIN_LEVEL) {
    return state;
  }

  const ghostPool = CORRUPTIBLE_GHOST_KINDS.filter((kind) => presentKinds.includes(kind));
  if (state.forcedGhostKind === null && ghostPool.length === 0) {
    return state;
  }

  const type = state.forcedType ?? takeRandom(CORRUPTION_IDS, rng);
  const ghostKind = state.forcedGhostKind ?? takeRandom(ghostPool, rng);

  return { ...state, type, ghostKind };
}

export function corruptionAiOption(
  state: RunCorruption,
): { ghostKind: GhostKindId; type: CorruptionId } | undefined {
  return state.ghostKind !== null && state.type !== null
    ? { ghostKind: state.ghostKind, type: state.type }
    : undefined;
}

export function resetCorruptionTransient(state: RunCorruption): RunCorruption {
  return {
    ...state,
    speedSurgeCycleMs: 0,
    wallPhaseCycleMs: 0,
    wallPhaseFlashMs: 0,
    wallPhasePendingTarget: null,
    invisibilityCycleMs: 0,
    pelletDropperCycleMs: 0,
    pelletDropperFlashMs: 0,
    pelletDropperDropsLeft: 0,
    trail: [],
    pelletDropperLastTile: null,
  };
}

export function tickSpeedSurge(state: RunCorruption, deltaMs: number): RunCorruption {
  if (state.type !== "speedSurge") {
    return state;
  }
  const cycleMs = (state.speedSurgeCycleMs + Math.max(0, deltaMs)) % SPEED_SURGE_CYCLE_MS;
  return { ...state, speedSurgeCycleMs: cycleMs };
}

export function isSpeedSurgeActive(state: RunCorruption): boolean {
  if (state.type !== "speedSurge") {
    return false;
  }
  return (
    state.speedSurgeCycleMs >= TELEGRAPH_FLASH_MS &&
    state.speedSurgeCycleMs < TELEGRAPH_FLASH_MS + SPEED_SURGE_ACTIVE_MS
  );
}

export function tickInvisibilityCycle(state: RunCorruption, deltaMs: number): RunCorruption {
  if (state.type !== "invisibility") {
    return state;
  }
  const cycleMs = (state.invisibilityCycleMs + Math.max(0, deltaMs)) % INVISIBILITY_CYCLE_MS;
  return { ...state, invisibilityCycleMs: cycleMs };
}

export function isInvisibilityHiddenInCycle(state: RunCorruption): boolean {
  if (state.type !== "invisibility") {
    return false;
  }
  return (
    state.invisibilityCycleMs >= TELEGRAPH_FLASH_MS &&
    state.invisibilityCycleMs < TELEGRAPH_FLASH_MS + INVISIBILITY_HIDDEN_MS
  );
}

export function isCorruptionFlashing(state: RunCorruption): boolean {
  switch (state.type) {
    case "speedSurge":
      return state.speedSurgeCycleMs < TELEGRAPH_FLASH_MS;
    case "invisibility":
      return state.invisibilityCycleMs < TELEGRAPH_FLASH_MS;
    case "wallPhaseDash":
      return state.wallPhasePendingTarget !== null;
    case "pelletDropper":
      return state.pelletDropperFlashMs > 0;
    default:
      return false;
  }
}
