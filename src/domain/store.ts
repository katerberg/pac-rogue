import type { Cell } from "./bonusBar";
import type { MazeLayout, SolidGrid } from "./maze";
import {
  baseIdOf,
  carryEnhancement,
  eligibleUpgrades,
  enhanceableUpgrades,
  enhancedIdOf,
  getUpgradeDef,
  isRare,
  storePriceFor,
  takeRandomFrom,
  takeWeightedUpgrade,
  type BaseUpgradeId,
  type UpgradeId,
  type UpgradeSchool,
} from "./upgrades";

export const STORE_SWAP_PRICE = 1;
export const STORE_ENHANCE_PRICE = 2;
export const STORE_ENHANCE_BORDER_COLOR = 0xffd24a;
const ENHANCE_GLOW_PERIOD_MS = 1600;
const ENHANCE_GLOW_MIN_ALPHA = 0.12;
const ENHANCE_GLOW_MAX_ALPHA = 0.5;
export const STORE_SLOT_SIZE = 2;
export const STORE_FIRST_LEVEL = 3;
export const STORE_FINAL_LEVEL = 8;

type StoreSlotKind = "upgrade" | "swap" | "enhance";

export type StoreSlotCell = { kind: StoreSlotKind; col: number; row: number };

export type StoreLayout = { slots: StoreSlotCell[]; freebie: Cell };

export type StoreFreebie = { kind: "life" | "quarter"; col: number; row: number; taken: boolean };

export type StoreSlot =
  | { kind: "upgrade"; col: number; row: number; id: BaseUpgradeId; sold: boolean }
  | {
      kind: "swap";
      col: number;
      row: number;
      outgoingId: UpgradeId;
      incomingBaseId: BaseUpgradeId | null;
      sold: boolean;
    }
  | { kind: "enhance"; col: number; row: number; targetId: BaseUpgradeId; sold: boolean };

export function storeSlotLabel(slot: StoreSlot): string {
  switch (slot.kind) {
    case "upgrade":
      return slot.id;
    case "swap":
      return `swap:${slot.outgoingId}`;
    case "enhance":
      return `enhance:${slot.targetId}`;
  }
}

export type StoreState = {
  slots: readonly StoreSlot[];
  freebie: StoreFreebie;
  activeSlot: number | null;
  dismissedSlot: number | null;
  clickedSlot: number | null;
  confirmYes: boolean;
};

export type StoreStepInput = {
  col: number;
  row: number;
  focus: "yes" | "no" | null;
  enter: boolean;
  pick?: "yes" | "no" | null;
  click?: number | null;
  moving?: boolean;
  quarters: number;
  owned: readonly UpgradeId[];
};

export type StorePurchase =
  | { kind: "upgrade"; id: UpgradeId; price: number }
  | { kind: "swap"; outgoingId: UpgradeId; incomingId: UpgradeId; price: number }
  | { kind: "enhance"; targetId: BaseUpgradeId; price: number };

export function purchaseSchool(purchase: StorePurchase): UpgradeSchool | null {
  switch (purchase.kind) {
    case "swap":
      return null;
    case "upgrade":
      return getUpgradeDef(baseIdOf(purchase.id)).school;
    case "enhance":
      return getUpgradeDef(purchase.targetId).school;
  }
}

export type StorePromptView = {
  kind: "confirm" | "needQuarters" | "nothingToSwap" | "nothingToEnhance";
  slot: StoreSlot;
  price: number;
};

const FREEBIE_CHAR = "F";

const SLOT_KIND_BY_CHAR: Record<string, StoreSlotKind> = {
  U: "upgrade",
  S: "swap",
  E: "enhance",
};

export function pickMidStoreLevel(rng: () => number): 5 | 6 {
  return rng() < 0.5 ? 5 : 6;
}

export function storeAfterLevel(levelIndex: number, midStoreLevel: number): boolean {
  return (
    levelIndex === STORE_FIRST_LEVEL ||
    levelIndex === midStoreLevel ||
    levelIndex === STORE_FINAL_LEVEL
  );
}

export function storeLevelFor(storeIndex: 1 | 2 | 3, midStoreLevel: number): number {
  return [STORE_FIRST_LEVEL, midStoreLevel, STORE_FINAL_LEVEL][storeIndex - 1]!;
}

export function parseStoreLayout(ascii: string): StoreLayout {
  const lines = ascii.split("\n");
  const claimed = new Set<string>();
  const cells: StoreSlotCell[] = [];
  const freebies: Cell[] = [];
  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col]!;
      if (ch === FREEBIE_CHAR) {
        freebies.push({ col, row });
        continue;
      }
      const kind = SLOT_KIND_BY_CHAR[ch];
      if (!kind || claimed.has(`${col},${row}`)) {
        continue;
      }
      for (let dy = 0; dy < STORE_SLOT_SIZE; dy += 1) {
        for (let dx = 0; dx < STORE_SLOT_SIZE; dx += 1) {
          if (lines[row + dy]?.[col + dx] !== ch || claimed.has(`${col + dx},${row + dy}`)) {
            throw new Error(`store slot ${ch} at ${col},${row} is not a full 2x2 block`);
          }
          claimed.add(`${col + dx},${row + dy}`);
        }
      }
      cells.push({ kind, col, row });
    }
  });
  if (freebies.length !== 1) {
    throw new Error(`store needs exactly one ${FREEBIE_CHAR} cell, found ${freebies.length}`);
  }
  return { slots: cells, freebie: freebies[0]! };
}

export function wallBlockMasks(
  walls: SolidGrid,
  start: Cell,
): { walls: SolidGrid; exterior: SolidGrid } {
  const inBlock = walls.map((line) => line.map(() => false));
  const stack = [start];
  while (stack.length > 0) {
    const { col, row } = stack.pop()!;
    if (!walls[row]?.[col] || inBlock[row]![col]) {
      continue;
    }
    inBlock[row]![col] = true;
    stack.push(
      { col: col + 1, row },
      { col: col - 1, row },
      { col, row: row + 1 },
      { col, row: row - 1 },
    );
  }
  return {
    walls: inBlock,
    exterior: walls.map((line, row) => line.map((wall, col) => wall && !inBlock[row]![col])),
  };
}

export function storeEntrance(layout: MazeLayout): Cell {
  return { col: 0, row: layout.playerSpawn.row };
}

export function withStoreEntranceClosed(layout: MazeLayout): SolidGrid {
  const entrance = storeEntrance(layout);
  return layout.playerSolids.map((line, row) =>
    line.map((solid, col) => solid || (col === entrance.col && row === entrance.row)),
  );
}

export function createStoreState(
  layout: StoreLayout,
  owned: readonly UpgradeId[],
  rng: () => number,
  firstStore = false,
  lifeRoom = true,
  guaranteedSchool: UpgradeSchool | null = null,
  previouslyOffered: readonly BaseUpgradeId[] = [],
): StoreState {
  const cells = layout.slots;
  let pool = eligibleUpgrades(owned).filter((id) => !previouslyOffered.includes(id));
  const slots: StoreSlot[] = [];
  const upgradeCells = cells.filter((cell) => cell.kind === "upgrade");
  const schoolPool =
    guaranteedSchool === null
      ? []
      : pool.filter((id) => getUpgradeDef(id).school === guaranteedSchool);
  let guaranteedCell: StoreSlotCell | null = null;
  let guaranteedId: BaseUpgradeId | null = null;
  if (schoolPool.length > 0 && upgradeCells.length > 0) {
    guaranteedCell = takeRandomFrom([...upgradeCells], rng);
    guaranteedId = takeWeightedUpgrade(schoolPool, rng);
    pool = pool.filter(
      (other) => other !== guaranteedId && !(isRare(guaranteedId!) && isRare(other)),
    );
  }
  const enhanceTargets = new Map<StoreSlotCell, BaseUpgradeId>();
  const enhanceable = enhanceableUpgrades(owned);
  const freshEnhanceable = enhanceable.filter((id) => !previouslyOffered.includes(id));
  const enhancePool = freshEnhanceable.length > 0 ? freshEnhanceable : enhanceable;
  for (const cell of cells) {
    if (cell.kind === "enhance" && enhancePool.length > 0) {
      enhanceTargets.set(cell, takeRandomFrom(enhancePool, rng));
    }
  }
  const enhanced = new Set(enhanceTargets.values());
  const tradeable = owned.filter((id) => !enhanced.has(baseIdOf(id)));
  for (const cell of cells) {
    const { kind, col, row } = cell;
    if (cell === guaranteedCell) {
      slots.push({ kind: "upgrade", col, row, id: guaranteedId!, sold: false });
      continue;
    }
    if (kind === "swap" && !firstStore && tradeable.length > 0) {
      const outgoingId = takeRandomFrom(tradeable, rng);
      slots.push({ kind, col, row, outgoingId, incomingBaseId: null, sold: false });
    } else if (enhanceTargets.has(cell)) {
      slots.push({ kind: "enhance", col, row, targetId: enhanceTargets.get(cell)!, sold: false });
    } else if (pool.length > 0) {
      const id = takeWeightedUpgrade(pool, rng);
      slots.push({ kind: "upgrade", col, row, id, sold: false });
      if (isRare(id)) {
        pool = pool.filter((other) => !isRare(other));
      }
    }
  }
  const stocked: StoreState = {
    slots,
    freebie: { ...layout.freebie, kind: lifeRoom ? "life" : "quarter", taken: false },
    activeSlot: null,
    dismissedSlot: null,
    clickedSlot: null,
    confirmYes: false,
  };
  return {
    ...stocked,
    slots: slots.map((slot) => rollSwapIncoming(slot, stocked, owned, rng, previouslyOffered)),
  };
}

export function offeredUpgradeIds(state: StoreState): BaseUpgradeId[] {
  return state.slots.flatMap((slot) => {
    switch (slot.kind) {
      case "upgrade":
        return [slot.id];
      case "enhance":
        return [slot.targetId];
      case "swap":
        return slot.incomingBaseId === null ? [] : [slot.incomingBaseId];
    }
  });
}

function rollSwapIncoming(
  slot: StoreSlot,
  state: StoreState,
  owned: readonly UpgradeId[],
  rng: () => number,
  previouslyOffered: readonly BaseUpgradeId[],
): StoreSlot {
  if (slot.kind !== "swap") {
    return slot;
  }
  const pool = swapIncomingPool(state, owned, slot.outgoingId).filter(
    (id) => !previouslyOffered.includes(id),
  );
  return { ...slot, incomingBaseId: pool.length > 0 ? takeWeightedUpgrade(pool, rng) : null };
}

function swapIncomingPool(
  state: StoreState,
  owned: readonly UpgradeId[],
  outgoingId: UpgradeId,
): BaseUpgradeId[] {
  const remaining = owned.filter((id) => baseIdOf(id) !== baseIdOf(outgoingId));
  return swapPool(state, remaining).filter((id) => id !== baseIdOf(outgoingId));
}

export function swapIncomingSchool(slot: StoreSlot & { kind: "swap" }): UpgradeSchool | null {
  return slot.incomingBaseId === null ? null : getUpgradeDef(slot.incomingBaseId).school;
}

export function slotPrice(slot: StoreSlot): number {
  switch (slot.kind) {
    case "swap":
      return STORE_SWAP_PRICE;
    case "enhance":
      return STORE_ENHANCE_PRICE;
    case "upgrade":
      return storePriceFor(slot.id);
  }
}

export function slotIndexAtCell(state: StoreState, col: number, row: number): number | null {
  const index = state.slots.findIndex(
    (slot) =>
      !slot.sold &&
      col >= slot.col &&
      col < slot.col + STORE_SLOT_SIZE &&
      row >= slot.row &&
      row < slot.row + STORE_SLOT_SIZE,
  );
  return index === -1 ? null : index;
}

function swapPool(state: StoreState, owned: readonly UpgradeId[]): BaseUpgradeId[] {
  const onShelf = new Set(
    state.slots.flatMap((slot) => (slot.kind === "upgrade" && !slot.sold ? [slot.id] : [])),
  );
  return eligibleUpgrades(owned).filter((id) => !onShelf.has(id));
}

export function promptView(
  state: StoreState,
  quarters: number,
  owned: readonly UpgradeId[],
): StorePromptView | null {
  if (state.activeSlot === null || state.activeSlot === state.dismissedSlot) {
    return null;
  }
  const slot = state.slots[state.activeSlot]!;
  const price = slotPrice(slot);
  if (slot.kind === "swap" && swapPool(state, owned).length === 0) {
    return { kind: "nothingToSwap", slot, price };
  }
  if (slot.kind === "enhance" && enhanceableUpgrades(owned).length === 0) {
    return { kind: "nothingToEnhance", slot, price };
  }
  return { kind: quarters < price ? "needQuarters" : "confirm", slot, price };
}

export type StorePanelMode = "idle" | "dimmed" | "info" | "choosing";

export function storePanelMode(
  state: StoreState,
  prompt: StorePromptView | null,
  index: number,
): StorePanelMode {
  if (prompt === null || state.activeSlot === null) {
    return "idle";
  }
  if (state.activeSlot !== index) {
    return "dimmed";
  }
  return prompt.kind === "confirm" ? "choosing" : "info";
}

type StoreStepResult = {
  state: StoreState;
  purchase: StorePurchase | null;
  pickup: StoreFreebie["kind"] | null;
};

export function storeStep(
  state: StoreState,
  input: StoreStepInput,
  rng: () => number,
): StoreStepResult {
  const { freebie } = state;
  if (freebie.taken || freebie.col !== input.col || freebie.row !== input.row) {
    return { ...slotStep(state, input, rng), pickup: null };
  }
  const taken = { ...state, freebie: { ...freebie, taken: true } };
  return { ...slotStep(taken, input, rng), pickup: freebie.kind };
}

function slotStep(
  state: StoreState,
  input: StoreStepInput,
  rng: () => number,
): { state: StoreState; purchase: StorePurchase | null } {
  const clickedNow =
    input.click != null && state.slots[input.click]?.sold === false ? input.click : null;
  let clicked = clickedNow ?? state.clickedSlot;
  if (clickedNow === null && input.moving && clicked !== null) {
    const held = promptView(
      { ...state, activeSlot: clicked, dismissedSlot: null },
      input.quarters,
      input.owned,
    );
    if (held?.kind !== "confirm") {
      clicked = null;
    }
  }
  const cellAt = slotIndexAtCell(state, input.col, input.row);
  const at = clicked ?? cellAt;
  const next: StoreState = {
    ...state,
    activeSlot: at,
    clickedSlot: clicked,
    dismissedSlot:
      clickedNow !== null && clickedNow === cellAt
        ? null
        : state.dismissedSlot === cellAt
          ? cellAt
          : null,
    confirmYes: at === state.activeSlot && state.confirmYes,
  };
  const view = promptView(next, input.quarters, input.owned);
  if (at === null || view?.kind !== "confirm") {
    return { state: next, purchase: null };
  }
  const picked = input.pick ?? null;
  if (picked === null && input.focus !== null) {
    return { state: { ...next, confirmYes: input.focus === "yes" }, purchase: null };
  }
  if (picked === null && !input.enter) {
    return { state: next, purchase: null };
  }
  const yes = picked === null ? next.confirmYes : picked === "yes";
  if (!yes) {
    return {
      state: {
        ...next,
        activeSlot: clicked === null ? at : cellAt,
        dismissedSlot: clicked === null || clicked === cellAt ? at : next.dismissedSlot,
        clickedSlot: null,
        confirmYes: false,
      },
      purchase: null,
    };
  }
  next.confirmYes = true;

  const slot = view.slot;
  const slots = next.slots.map((s, i) => (i === at ? { ...s, sold: true } : s));
  const sold: StoreState = {
    ...next,
    slots,
    activeSlot: null,
    clickedSlot: null,
    confirmYes: false,
  };
  if (slot.kind === "upgrade") {
    return { state: sold, purchase: { kind: "upgrade", id: slot.id, price: view.price } };
  }
  if (slot.kind === "enhance") {
    const targets = enhanceableUpgrades(input.owned);
    const targetId = targets.includes(slot.targetId) ? slot.targetId : takeRandomFrom(targets, rng);
    const relabeled = sold.slots.map((s) =>
      s.kind === "swap" && baseIdOf(s.outgoingId) === targetId
        ? { ...s, outgoingId: enhancedIdOf(targetId) }
        : s,
    );
    return {
      state: { ...sold, slots: relabeled },
      purchase: { kind: "enhance", targetId, price: view.price },
    };
  }
  const outgoingId =
    input.owned.find((id) => baseIdOf(id) === baseIdOf(slot.outgoingId)) ?? slot.outgoingId;
  const afterSwap = swapIncomingPool(next, input.owned, outgoingId);
  const incomingBase =
    slot.incomingBaseId !== null && afterSwap.includes(slot.incomingBaseId)
      ? slot.incomingBaseId
      : takeWeightedUpgrade(afterSwap.length > 0 ? afterSwap : swapPool(next, input.owned), rng);
  return {
    state: sold,
    purchase: {
      kind: "swap",
      outgoingId,
      incomingId: carryEnhancement(outgoingId, incomingBase),
      price: view.price,
    },
  };
}

export const STORE_EXIT_SLIDE_TILES = 2;
const STORE_EXIT_FADE_START_TILES = 0.5;

export type StoreExitDirection = { dx: -1 | 0 | 1; dy: -1 | 0 | 1 };

export function storeExitDirection(
  col: number,
  row: number,
  cols: number,
  rows: number,
): StoreExitDirection | null {
  if (col <= 0) return { dx: -1, dy: 0 };
  if (col >= cols - 1) return { dx: 1, dy: 0 };
  if (row <= 0) return { dx: 0, dy: -1 };
  if (row >= rows - 1) return { dx: 0, dy: 1 };
  return null;
}

export function storeExitAlpha(traveledTiles: number): number {
  const fadeTiles = STORE_EXIT_SLIDE_TILES - STORE_EXIT_FADE_START_TILES;
  return Math.min(1, Math.max(0, 1 - (traveledTiles - STORE_EXIT_FADE_START_TILES) / fadeTiles));
}

export function enhanceGlowAlpha(elapsedMs: number): number {
  const wave = (1 - Math.cos((2 * Math.PI * elapsedMs) / ENHANCE_GLOW_PERIOD_MS)) / 2;
  return ENHANCE_GLOW_MIN_ALPHA + (ENHANCE_GLOW_MAX_ALPHA - ENHANCE_GLOW_MIN_ALPHA) * wave;
}
