import { CORRUPTION_IDS, type CorruptionId } from "./corruption";
import { GHOST_KIND, type GhostKindId } from "./ghostKind";
import { ALL_UPGRADE_IDS, type UpgradeId } from "./upgrades";

export type SeenRecord = {
  ghosts: GhostKindId[];
  corruptions: CorruptionId[];
  upgrades: UpgradeId[];
};

const GHOST_KIND_IDS: readonly GhostKindId[] = Object.values(GHOST_KIND);

export function emptySeenRecord(): SeenRecord {
  return { ghosts: [], corruptions: [], upgrades: [] };
}

export function allSeenRecord(): SeenRecord {
  return {
    ghosts: [...GHOST_KIND_IDS],
    corruptions: [...CORRUPTION_IDS],
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
      corruptions: pickKnown(record.corruptions, CORRUPTION_IDS),
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

export function withSeenCorruption(record: SeenRecord, id: CorruptionId): SeenRecord {
  if (record.corruptions.includes(id)) {
    return record;
  }
  const merged = [...record.corruptions, id];
  return { ...record, corruptions: CORRUPTION_IDS.filter((known) => merged.includes(known)) };
}

export function withSeenUpgrade(record: SeenRecord, id: UpgradeId): SeenRecord {
  if (record.upgrades.includes(id)) {
    return record;
  }
  const merged = [...record.upgrades, id];
  return { ...record, upgrades: ALL_UPGRADE_IDS.filter((known) => merged.includes(known)) };
}

export type LearnAllMode = "all" | "none";

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
