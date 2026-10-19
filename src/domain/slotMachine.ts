import {
  eligibleUpgrades,
  getUpgradeDef,
  schoolAffinityPoints,
  SCHOOL_AFFINITY_COMMON_RATE,
  takeWeightedUpgrade,
  UPGRADE_SCHOOL_ORDER,
  upgradeOfferWeight,
  type BaseUpgradeId,
  type UpgradeId,
  type UpgradeSchool,
} from "./upgrades";

export type SlotSchool = Exclude<UpgradeSchool, "neutral">;
export type SlotSymbol = "quarter" | "life" | SlotSchool;
export type SlotOutcome = { quarters: number; upgrades: number; lives: number };
export type SlotGrid = readonly (readonly SlotSymbol[])[];
export type SlotWin = { line: number; symbol: SlotSymbol };
export type SlotSpin = { grid: SlotGrid; wins: SlotWin[]; anticipation: boolean };
export type SlotTimeline = { reelStopsMs: number[]; winStartsMs: number[]; durationMs: number };
type Cell = readonly [reel: number, row: number];

export const SLOT_REELS = 3;
export const SLOT_ROWS = 3;
export const SLOT_SCHOOLS = UPGRADE_SCHOOL_ORDER.filter(
  (school): school is SlotSchool => school !== "neutral",
);
export const SLOT_LINES: readonly (readonly Cell[])[] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  [
    [0, 2],
    [1, 1],
    [2, 0],
  ],
];

const SLOT_OUTCOMES: readonly (SlotOutcome & { weight: number })[] = [
  { weight: 7, quarters: 0, upgrades: 0, lives: 0 },
  { weight: 28, quarters: 1, upgrades: 0, lives: 0 },
  { weight: 12, quarters: 2, upgrades: 0, lives: 0 },
  { weight: 3, quarters: 3, upgrades: 0, lives: 0 },
  { weight: 1, quarters: 4, upgrades: 0, lives: 0 },
  { weight: 0.5, quarters: 5, upgrades: 0, lives: 0 },
  { weight: 16, quarters: 0, upgrades: 1, lives: 0 },
  { weight: 6, quarters: 1, upgrades: 1, lives: 0 },
  { weight: 1.5, quarters: 2, upgrades: 1, lives: 0 },
  { weight: 0.5, quarters: 0, upgrades: 2, lives: 0 },
  { weight: 16, quarters: 0, upgrades: 0, lives: 1 },
  { weight: 6, quarters: 1, upgrades: 0, lives: 1 },
  { weight: 1.5, quarters: 2, upgrades: 0, lives: 1 },
  { weight: 1, quarters: 0, upgrades: 1, lives: 1 },
];

const FILLER_QUARTER_WEIGHT = 0.45;
const FILLER_LIFE_WEIGHT = 0.08;
const TEASE_CHANCE = 0.25;
const COMPOSE_ATTEMPTS = 200;
const TEASE_ATTEMPTS = 100;

export const SLOT_REEL_STOP_MS = [800, 1200, 1600] as const;
export const SLOT_ANTICIPATION_MS = 500;
const SLOT_NO_WIN_HOLD_MS = 800;
const SLOT_SINGLE_WIN_MS = 1400;
const SLOT_MULTI_LINE_MS = 900;
const SLOT_MULTI_FINALE_MS = 900;

export function slotOutcomeTable(livesOnReels: boolean): (SlotOutcome & { weight: number })[] {
  return SLOT_OUTCOMES.map((outcome) =>
    livesOnReels
      ? { ...outcome }
      : { ...outcome, quarters: outcome.quarters + outcome.lives, lives: 0 },
  );
}

export function rollSlotOutcome(rng: () => number, livesOnReels: boolean): SlotOutcome {
  const picked = pickWeighted(
    slotOutcomeTable(livesOnReels).map((outcome) => [outcome, outcome.weight] as const),
    rng,
  );
  return { quarters: picked.quarters, upgrades: picked.upgrades, lives: picked.lives };
}

export function slotSchoolWeights(owned: readonly UpgradeId[]): Record<SlotSchool, number> {
  return Object.fromEntries(
    SLOT_SCHOOLS.map((school) => [
      school,
      1 + SCHOOL_AFFINITY_COMMON_RATE * schoolAffinityPoints(owned, school),
    ]),
  ) as Record<SlotSchool, number>;
}

function isSchool(symbol: SlotSymbol): symbol is SlotSchool {
  return symbol !== "quarter" && symbol !== "life";
}

function payOrder(symbol: SlotSymbol): number {
  return symbol === "quarter" ? 0 : symbol === "life" ? 1 : 2;
}

export function slotWins(grid: SlotGrid): SlotWin[] {
  const wins: SlotWin[] = [];
  SLOT_LINES.forEach((cells, line) => {
    const [first, ...rest] = cells.map(([reel, row]) => grid[reel]![row]!);
    if (rest.every((symbol) => symbol === first)) {
      wins.push({ line, symbol: first! });
    }
  });
  return wins.sort((a, b) => payOrder(a.symbol) - payOrder(b.symbol));
}

export function slotWinTotals(wins: readonly SlotWin[]): SlotOutcome {
  return {
    quarters: wins.filter((win) => win.symbol === "quarter").length,
    lives: wins.filter((win) => win.symbol === "life").length,
    upgrades: wins.filter((win) => isSchool(win.symbol)).length,
  };
}

export function slotAnticipation(grid: SlotGrid): boolean {
  return SLOT_LINES.some((cells) => {
    const a = grid[cells[0]![0]]![cells[0]![1]]!;
    const b = grid[cells[1]![0]]![cells[1]![1]]!;
    return a === b && a !== "quarter";
  });
}

function pickWeighted<T>(entries: readonly (readonly [T, number])[], rng: () => number): T {
  let roll = rng() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  const picked = entries.find(([, weight]) => (roll -= weight) < 0) ?? entries[entries.length - 1]!;
  return picked[0];
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function sameOutcome(a: SlotOutcome, b: SlotOutcome): boolean {
  return a.quarters === b.quarters && a.upgrades === b.upgrades && a.lives === b.lives;
}

function tryCompose(
  outcome: SlotOutcome,
  schools: readonly (readonly [SlotSchool, number])[],
  filler: readonly (readonly [SlotSymbol, number])[],
  tease: boolean,
  rng: () => number,
): SlotSymbol[][] | null {
  const grid: (SlotSymbol | null)[][] = Array.from({ length: SLOT_REELS }, () =>
    Array<SlotSymbol | null>(SLOT_ROWS).fill(null),
  );
  const place = ([reel, row]: Cell, symbol: SlotSymbol): boolean => {
    const current = grid[reel]![row];
    if (current !== null && current !== symbol) {
      return false;
    }
    grid[reel]![row] = symbol;
    return true;
  };
  const symbols: SlotSymbol[] = [
    ...Array<SlotSymbol>(outcome.quarters).fill("quarter"),
    ...Array<SlotSymbol>(outcome.lives).fill("life"),
    ...Array.from({ length: outcome.upgrades }, () => pickWeighted(schools, rng)),
  ];
  const lines = shuffled(SLOT_LINES, rng);
  for (const [index, symbol] of symbols.entries()) {
    if (!lines[index]!.every((cell) => place(cell, symbol))) {
      return null;
    }
  }
  if (tease) {
    const row = Math.floor(rng() * SLOT_ROWS);
    const offRow = row === 0 ? 1 : row === SLOT_ROWS - 1 ? row - 1 : row + (rng() < 0.5 ? -1 : 1);
    const symbol = pickWeighted<SlotSymbol>(
      filler.filter(([candidate]) => candidate !== "quarter"),
      rng,
    );
    const teased: Cell[] = [
      [0, row],
      [1, row],
      [2, offRow],
    ];
    if (!teased.every((cell) => place(cell, symbol))) {
      return null;
    }
  }
  const filled = grid.map((reel) => reel.map((symbol) => symbol ?? pickWeighted(filler, rng)));
  return sameOutcome(slotWinTotals(slotWins(filled)), outcome) ? filled : null;
}

export function composeSlotGrid(
  outcome: SlotOutcome,
  schoolWeights: Record<SlotSchool, number>,
  livesOnReels: boolean,
  rng: () => number,
): SlotGrid {
  const schools = SLOT_SCHOOLS.map((school) => [school, schoolWeights[school]] as const);
  const schoolTotal = schools.reduce((sum, [, weight]) => sum + weight, 0);
  const lifeWeight = livesOnReels ? FILLER_LIFE_WEIGHT : 0;
  const schoolShare = 1 - FILLER_QUARTER_WEIGHT - lifeWeight;
  const filler: (readonly [SlotSymbol, number])[] = [
    ["quarter", FILLER_QUARTER_WEIGHT],
    ...(livesOnReels ? [["life", lifeWeight] as const] : []),
    ...schools.map(([school, weight]) => [school, (schoolShare * weight) / schoolTotal] as const),
  ];
  const wantTease = outcome.upgrades === 0 && outcome.lives === 0 && rng() < TEASE_CHANCE;
  for (let attempt = 0; attempt < COMPOSE_ATTEMPTS; attempt += 1) {
    const tease = wantTease && attempt < TEASE_ATTEMPTS;
    const grid = tryCompose(outcome, schools, filler, tease, rng);
    if (grid !== null) {
      return grid;
    }
  }
  return Array.from({ length: SLOT_REELS }, (_, reel) =>
    Array.from({ length: SLOT_ROWS }, (_, row) => SLOT_SCHOOLS[(reel * SLOT_ROWS + row) % 6]!),
  );
}

export function spinSlot(
  outcome: SlotOutcome,
  schoolWeights: Record<SlotSchool, number>,
  livesOnReels: boolean,
  rng: () => number,
): SlotSpin {
  const grid = composeSlotGrid(outcome, schoolWeights, livesOnReels, rng);
  return { grid, wins: slotWins(grid), anticipation: slotAnticipation(grid) };
}

export function slotTimeline(spin: SlotSpin): SlotTimeline {
  const reelStopsMs = SLOT_REEL_STOP_MS.map((ms, reel) =>
    reel === SLOT_REELS - 1 && spin.anticipation ? ms + SLOT_ANTICIPATION_MS : ms,
  );
  const payoutStartMs = reelStopsMs[SLOT_REELS - 1]!;
  const count = spin.wins.length;
  const winStartsMs = spin.wins.map((_, index) => payoutStartMs + index * SLOT_MULTI_LINE_MS);
  const payoutMs =
    count === 0
      ? SLOT_NO_WIN_HOLD_MS
      : count === 1
        ? SLOT_SINGLE_WIN_MS
        : count * SLOT_MULTI_LINE_MS + SLOT_MULTI_FINALE_MS;
  return { reelStopsMs, winStartsMs, durationMs: payoutStartMs + payoutMs };
}

export function pickSlotUpgrade(
  owned: readonly UpgradeId[],
  school: SlotSchool,
  rng: () => number,
): BaseUpgradeId | null {
  const pool = eligibleUpgrades(owned).filter((id) => getUpgradeDef(id).school === school);
  return pool.length === 0
    ? null
    : takeWeightedUpgrade(pool, rng, (id) => upgradeOfferWeight(id, owned));
}

export function parseJumpToSpinnerFlag(params: URLSearchParams): boolean {
  return params.get("jumpToSpinner") === "1";
}

export function parseSlotParam(params: URLSearchParams): SlotOutcome | null {
  const match = /^(?:0|(?=.)(?:(\d)q)?(?:(\d)u)?(?:(\d)l)?)$/.exec(params.get("slot") ?? "");
  if (match === null) {
    return null;
  }
  const outcome = {
    quarters: Number(match[1] ?? 0),
    upgrades: Number(match[2] ?? 0),
    lives: Number(match[3] ?? 0),
  };
  return outcome.quarters + outcome.upgrades + outcome.lives <= SLOT_LINES.length ? outcome : null;
}

export function slotHeld(timeline: SlotTimeline, elapsedMs: number): boolean {
  return elapsedMs >= timeline.durationMs;
}

export type SlotFrame = {
  stopped: boolean[];
  anticipating: boolean;
  activeWin: number | null;
  finale: boolean;
  held: boolean;
};

const SLOT_STRIP: readonly SlotSymbol[] = [
  "quarter",
  "death",
  "quarter",
  "harvest",
  "life",
  "quarter",
  "speed",
  "automation",
  "quarter",
  "protection",
  "quarter",
  "disruption",
];
const SLOT_STRIP_STEP_MS = 70;

export function slotFrame(spin: SlotSpin, timeline: SlotTimeline, elapsedMs: number): SlotFrame {
  const stopped = timeline.reelStopsMs.map((ms) => elapsedMs >= ms);
  const finaleStartMs =
    spin.wins.length > 1
      ? timeline.winStartsMs[0]! + spin.wins.length * SLOT_MULTI_LINE_MS
      : Number.POSITIVE_INFINITY;
  const held = slotHeld(timeline, elapsedMs);
  const finale = !held && elapsedMs >= finaleStartMs;
  let activeWin: number | null = null;
  timeline.winStartsMs.forEach((startMs, index) => {
    if (!held && !finale && elapsedMs >= startMs) {
      activeWin = index;
    }
  });
  return {
    stopped,
    anticipating: spin.anticipation && stopped[1] === true && stopped[2] === false,
    activeWin,
    finale,
    held,
  };
}

export function slotSpinningSymbol(reel: number, row: number, elapsedMs: number): SlotSymbol {
  const step = Math.floor(elapsedMs / SLOT_STRIP_STEP_MS);
  return SLOT_STRIP[(step + row + reel * 5) % SLOT_STRIP.length]!;
}
