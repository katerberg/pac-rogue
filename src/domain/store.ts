import {
  baseIdOf,
  carryEnhancement,
  eligibleUpgrades,
  enhanceableUpgrades,
  enhancedIdOf,
  isRare,
  storePriceFor,
  takeRandomFrom,
  type BaseUpgradeId,
  type UpgradeId,
} from "./upgrades";

export const STORE_LIFE_PRICE = 1;
export const STORE_SWAP_PRICE = 1;
export const STORE_ENHANCE_PRICE = 2;
export const STORE_ENHANCE_BORDER_COLOR = 0xffd24a;
const ENHANCE_GLOW_PERIOD_MS = 1600;
const ENHANCE_GLOW_MIN_ALPHA = 0.12;
const ENHANCE_GLOW_MAX_ALPHA = 0.5;
export const STORE_SLOT_SIZE = 2;
export const STORE_FIRST_LEVEL = 3;
export const STORE_FINAL_LEVEL = 8;

type StoreSlotKind = "life" | "upgrade" | "swap" | "enhance";

export type StoreSlotCell = { kind: StoreSlotKind; col: number; row: number };

export type StoreSlot =
  | { kind: "life"; col: number; row: number; sold: boolean }
  | { kind: "upgrade"; col: number; row: number; id: BaseUpgradeId; sold: boolean }
  | { kind: "swap"; col: number; row: number; outgoingId: UpgradeId; sold: boolean }
  | { kind: "enhance"; col: number; row: number; targetId: BaseUpgradeId; sold: boolean };

export function storeSlotLabel(slot: StoreSlot): string {
  switch (slot.kind) {
    case "upgrade":
      return slot.id;
    case "swap":
      return `swap:${slot.outgoingId}`;
    case "enhance":
      return `enhance:${slot.targetId}`;
    case "life":
      return "life";
  }
}

export type StoreState = {
  slots: readonly StoreSlot[];
  activeSlot: number | null;
  dismissedSlot: number | null;
  clickedSlot: number | null;
  confirmYes: boolean;
};

export type StoreStepInput = {
  col: number;
  row: number;
  toggle: boolean;
  enter: boolean;
  pick?: "yes" | "no" | null;
  click?: number | null;
  moving?: boolean;
  quarters: number;
  owned: readonly UpgradeId[];
};

export type StorePurchase =
  | { kind: "life"; price: number }
  | { kind: "upgrade"; id: UpgradeId; price: number }
  | { kind: "swap"; outgoingId: UpgradeId; incomingId: UpgradeId; price: number }
  | { kind: "enhance"; targetId: BaseUpgradeId; price: number };

export type StorePromptView = {
  kind: "confirm" | "needQuarters" | "nothingToSwap" | "nothingToEnhance";
  slot: StoreSlot;
  price: number;
};

const SLOT_KIND_BY_CHAR: Record<string, StoreSlotKind> = {
  L: "life",
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

export function parseStoreSlots(ascii: string): StoreSlotCell[] {
  const lines = ascii.split("\n");
  const claimed = new Set<string>();
  const cells: StoreSlotCell[] = [];
  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col]!;
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
  return cells;
}

export function createStoreState(
  cells: readonly StoreSlotCell[],
  owned: readonly UpgradeId[],
  rng: () => number,
  firstStore = false,
  lifeRoom = Number.POSITIVE_INFINITY,
): StoreState {
  let pool = eligibleUpgrades(owned);
  const slots: StoreSlot[] = [];
  let lifeSlots = 0;
  for (const { kind, col, row } of cells) {
    if (kind === "life") {
      if (lifeSlots < lifeRoom) {
        lifeSlots += 1;
        slots.push({ kind, col, row, sold: false });
      }
    } else if (kind === "upgrade" && pool.length > 0) {
      const id = takeRandomFrom(pool, rng);
      slots.push({ kind, col, row, id, sold: false });
      if (isRare(id)) {
        pool = pool.filter((other) => !isRare(other));
      }
    } else if (kind === "swap" && !firstStore && owned.length > 0) {
      const outgoingId = takeRandomFrom([...owned], rng);
      slots.push({ kind, col, row, outgoingId, sold: false });
    } else if (kind === "enhance") {
      const targets = enhanceableUpgrades(owned);
      if (targets.length > 0) {
        slots.push({ kind, col, row, targetId: takeRandomFrom(targets, rng), sold: false });
      }
    }
  }
  return { slots, activeSlot: null, dismissedSlot: null, clickedSlot: null, confirmYes: false };
}

export function slotPrice(slot: StoreSlot): number {
  switch (slot.kind) {
    case "life":
      return STORE_LIFE_PRICE;
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
  const shelf = state.slots.flatMap((slot) => (slot.kind === "upgrade" ? [slot] : []));
  const onShelf = new Set(shelf.flatMap((slot) => (slot.sold ? [] : [slot.id])));
  const shelfHasRare = shelf.some((slot) => isRare(slot.id));
  return eligibleUpgrades(owned).filter((id) => !onShelf.has(id) && !(shelfHasRare && isRare(id)));
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

export function storeStep(
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
  if (picked === null && input.toggle) {
    return { state: { ...next, confirmYes: !next.confirmYes }, purchase: null };
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
  if (slot.kind === "life") {
    return { state: sold, purchase: { kind: "life", price: view.price } };
  }
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
  const remaining = input.owned.filter((id) => baseIdOf(id) !== baseIdOf(outgoingId));
  const afterSwap = swapPool(next, remaining).filter((id) => id !== baseIdOf(outgoingId));
  const incomingBase = takeRandomFrom(
    afterSwap.length > 0 ? afterSwap : swapPool(next, input.owned),
    rng,
  );
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
