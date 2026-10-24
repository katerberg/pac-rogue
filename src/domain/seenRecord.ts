import { GHOST_KIND, ghostKindLabel, type GhostKindId } from "./ghostKind";
import { ALL_UPGRADE_IDS, baseIdOf, type UpgradeId } from "./upgrades";

export type SeenRecord = {
  ghosts: GhostKindId[];
  upgrades: UpgradeId[];
};

const GHOST_KIND_IDS: readonly GhostKindId[] = Object.values(GHOST_KIND);

export function emptySeenRecord(): SeenRecord {
  return { ghosts: [], upgrades: [] };
}

export function allSeenRecord(): SeenRecord {
  return {
    ghosts: [...GHOST_KIND_IDS],
    upgrades: [...ALL_UPGRADE_IDS],
  };
}

function pickKnown<T>(raw: unknown, known: readonly T[]): T[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return known.filter((id) => raw.includes(id));
}

export function parseSeenRecord(raw: string | null): SeenRecord {
  if (raw === null) {
    return emptySeenRecord();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return emptySeenRecord();
    }
    const record = parsed as Record<string, unknown>;
    return {
      ghosts: pickKnown(record.ghosts, GHOST_KIND_IDS),
      upgrades: pickKnown(record.upgrades, ALL_UPGRADE_IDS),
    };
  } catch {
    return emptySeenRecord();
  }
}

export function serializeSeenRecord(record: SeenRecord): string {
  return JSON.stringify(record);
}

export function withSeenGhosts(record: SeenRecord, kinds: readonly GhostKindId[]): SeenRecord {
  if (kinds.every((kind) => record.ghosts.includes(kind))) {
    return record;
  }
  const merged = [...record.ghosts, ...kinds];
  return { ...record, ghosts: GHOST_KIND_IDS.filter((id) => merged.includes(id)) };
}

export function withSeenUpgrade(record: SeenRecord, id: UpgradeId): SeenRecord {
  const baseId = baseIdOf(id);
  if (record.upgrades.includes(baseId)) {
    return record;
  }
  const merged = [...record.upgrades, baseId];
  return { ...record, upgrades: ALL_UPGRADE_IDS.filter((known) => merged.includes(known)) };
}

export type LearnAllMode = "all" | "none";

export const LEARN_LOCKED_GHOST_LABEL = "???";

export function learnSeenRecord(mode: LearnAllMode | null, stored: () => SeenRecord): SeenRecord {
  const upgrades =
    mode === "all" ? allSeenRecord().upgrades : mode === "none" ? [] : stored().upgrades;
  const ghosts = mode === "all" ? GHOST_KIND_IDS : mode === "none" ? [] : stored().ghosts;
  return withSeenGhosts({ ghosts: [...ghosts], upgrades }, [GHOST_KIND.blinky]);
}

export function learnGhostUnlocked(record: SeenRecord, kind: GhostKindId): boolean {
  return kind === GHOST_KIND.blinky || record.ghosts.includes(kind);
}

export function learnGhostLabel(record: SeenRecord, kind: GhostKindId): string {
  return learnGhostUnlocked(record, kind) ? ghostKindLabel(kind) : LEARN_LOCKED_GHOST_LABEL;
}

export function parseLearnAllMode(params: URLSearchParams): LearnAllMode | null {
  const raw = params.get("learnAll");
  if (raw === "1") {
    return "all";
  }
  if (raw === "0") {
    return "none";
  }
  return null;
}
