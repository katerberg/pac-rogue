export const MAZE_CANDIDATES_VERSION = 1 as const;
export const MAZE_POOL_VERSION = 1 as const;
export const MAZE_CURATOR_STORAGE_KEY = "pac-rogue.maze-curator.v1";

export const DEFAULT_CANDIDATE_COUNT = 500;
/** Seed index attempts before giving up on filling `count` successes. */
export const CANDIDATE_SEED_ATTEMPT_CEILING = 20_000;

export type MazeCandidateDecision = "yes" | "no";

export type MazeCandidate = {
  id: number;
  seed: string;
  seedUsed: string;
  ascii: string;
  pelletCount: number;
  tunnels: number[];
};

export type MazeCandidatesFile = {
  version: typeof MAZE_CANDIDATES_VERSION;
  generatedAt: string;
  count: number;
  candidates: MazeCandidate[];
};

export type MazePoolFile = {
  version: typeof MAZE_POOL_VERSION;
  exportedAt: string;
  count: number;
  maps: MazeCandidate[];
};

export type MazeCuratorState = {
  candidatesFingerprint: string;
  /** Ordered ids that have a decision (newest last). */
  order: number[];
  decisions: Record<string, MazeCandidateDecision>;
};

export function candidateSeed(index: number): string {
  return `pool-cand-${index}`;
}

export function tunnelRowsFromAscii(ascii: string): number[] {
  const lines = ascii.split("\n");
  const rows: number[] = [];
  for (let row = 0; row < lines.length; row += 1) {
    const line = lines[row]!;
    if (line.length === 0) {
      continue;
    }
    const left = line[0]!;
    const right = line[line.length - 1]!;
    if (left !== "#" && right !== "#") {
      rows.push(row);
    }
  }
  return rows;
}

export function candidatesFingerprint(
  file: Pick<MazeCandidatesFile, "generatedAt" | "count">,
): string {
  return `${file.generatedAt}|${file.count}`;
}

export function emptyCuratorState(fingerprint: string): MazeCuratorState {
  return { candidatesFingerprint: fingerprint, order: [], decisions: {} };
}

export function parseCuratorState(raw: string | null, fingerprint: string): MazeCuratorState {
  if (raw === null) {
    return emptyCuratorState(fingerprint);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return emptyCuratorState(fingerprint);
    }
    const record = parsed as Record<string, unknown>;
    if (record.candidatesFingerprint !== fingerprint) {
      return emptyCuratorState(fingerprint);
    }
    if (
      !Array.isArray(record.order) ||
      typeof record.decisions !== "object" ||
      record.decisions === null
    ) {
      return emptyCuratorState(fingerprint);
    }
    const decisions: Record<string, MazeCandidateDecision> = {};
    for (const [key, value] of Object.entries(record.decisions as Record<string, unknown>)) {
      if (value === "yes" || value === "no") {
        decisions[key] = value;
      }
    }
    const order = record.order.filter(
      (id): id is number => typeof id === "number" && Number.isInteger(id),
    );
    return { candidatesFingerprint: fingerprint, order, decisions };
  } catch {
    return emptyCuratorState(fingerprint);
  }
}

export function decideCandidate(
  state: MazeCuratorState,
  id: number,
  decision: MazeCandidateDecision,
): MazeCuratorState {
  const key = String(id);
  if (state.decisions[key] !== undefined) {
    return state;
  }
  return {
    ...state,
    order: [...state.order, id],
    decisions: { ...state.decisions, [key]: decision },
  };
}

export function undoLastDecision(state: MazeCuratorState): MazeCuratorState {
  if (state.order.length === 0) {
    return state;
  }
  const order = state.order.slice(0, -1);
  const lastId = state.order[state.order.length - 1]!;
  const decisions = { ...state.decisions };
  delete decisions[String(lastId)];
  return { ...state, order, decisions };
}

export function nextUndecidedIndex(
  candidates: readonly MazeCandidate[],
  state: MazeCuratorState,
): number {
  for (let i = 0; i < candidates.length; i += 1) {
    if (state.decisions[String(candidates[i]!.id)] === undefined) {
      return i;
    }
  }
  return candidates.length;
}

export function keptCount(state: MazeCuratorState): number {
  let n = 0;
  for (const value of Object.values(state.decisions)) {
    if (value === "yes") {
      n += 1;
    }
  }
  return n;
}

export function remainingCount(
  candidates: readonly MazeCandidate[],
  state: MazeCuratorState,
): number {
  return candidates.length - Object.keys(state.decisions).length;
}

export function exportPool(
  candidates: readonly MazeCandidate[],
  state: MazeCuratorState,
  exportedAt: string = new Date().toISOString(),
): MazePoolFile {
  const maps = candidates.filter((c) => state.decisions[String(c.id)] === "yes");
  return {
    version: MAZE_POOL_VERSION,
    exportedAt,
    count: maps.length,
    maps,
  };
}

export function parseCandidatesFile(raw: unknown): MazeCandidatesFile | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (record.version !== MAZE_CANDIDATES_VERSION) {
    return null;
  }
  if (typeof record.generatedAt !== "string" || typeof record.count !== "number") {
    return null;
  }
  if (!Array.isArray(record.candidates)) {
    return null;
  }
  const candidates: MazeCandidate[] = [];
  for (const entry of record.candidates) {
    if (entry === null || typeof entry !== "object") {
      return null;
    }
    const c = entry as Record<string, unknown>;
    if (
      typeof c.id !== "number" ||
      typeof c.seed !== "string" ||
      typeof c.seedUsed !== "string" ||
      typeof c.ascii !== "string" ||
      typeof c.pelletCount !== "number" ||
      !Array.isArray(c.tunnels) ||
      !c.tunnels.every((t) => typeof t === "number")
    ) {
      return null;
    }
    candidates.push({
      id: c.id,
      seed: c.seed,
      seedUsed: c.seedUsed,
      ascii: c.ascii,
      pelletCount: c.pelletCount,
      tunnels: c.tunnels as number[],
    });
  }
  return {
    version: MAZE_CANDIDATES_VERSION,
    generatedAt: record.generatedAt,
    count: record.count,
    candidates,
  };
}
