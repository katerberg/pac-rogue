import { describe, expect, it } from "vitest";
import { activateAsciiLayout, activateLayout, isWalkable } from "./maze";
import { STORE_MAZE_ASCII } from "./mazeLayouts";
import {
  STORE_ENHANCE_PRICE,
  STORE_LIFE_PRICE,
  enhanceGlowAlpha,
  STORE_SWAP_PRICE,
  createStoreState,
  STORE_EXIT_SLIDE_TILES,
  storeExitAlpha,
  storeExitDirection,
  parseStoreSlots,
  pickMidStoreLevel,
  promptView,
  storeAfterLevel,
  storeStep,
  type StoreState,
  type StoreStepInput,
} from "./store";
import { ALL_UPGRADE_IDS, STORE_UPGRADE_PRICE, type UpgradeId } from "./upgrades";

const zeroRng = () => 0;

function input(overrides: Partial<StoreStepInput>): StoreStepInput {
  return {
    col: 1,
    row: 1,
    toggle: false,
    enter: false,
    quarters: 10,
    owned: [],
    ...overrides,
  };
}

function confirmYes(state: StoreState, overrides: Partial<StoreStepInput>) {
  const toggled = storeStep(state, input({ ...overrides, toggle: true }), zeroRng).state;
  return storeStep(toggled, input({ ...overrides, enter: true }), zeroRng);
}

function stateWith(owned: readonly UpgradeId[]): StoreState {
  return createStoreState(parseStoreSlots(STORE_MAZE_ASCII), owned, zeroRng);
}

describe("store layout", () => {
  it("builds with no pellets and opens tunnels on all four sides", () => {
    const layout = activateAsciiLayout(STORE_MAZE_ASCII, "store");
    expect(layout.pelletCount).toBe(0);
    const last = layout.rows - 1;
    expect(isWalkable(10, 0, layout.playerSolids)).toBe(true);
    expect(isWalkable(11, last, layout.playerSolids)).toBe(true);
    expect(isWalkable(0, 10, layout.playerSolids)).toBe(true);
    expect(isWalkable(layout.cols - 1, 10, layout.playerSolids)).toBe(true);
    activateLayout("maze1");
  });

  it("is intro-sized with no ghost house and roomier than the intro maze", () => {
    const layout = activateAsciiLayout(STORE_MAZE_ASCII, "store");
    expect(layout.house.flat().some(Boolean)).toBe(false);
    const interior = layout.walls.slice(1, -1).flatMap((row) => row.slice(1, -1));
    const coverage = interior.filter(Boolean).length / interior.length;
    expect([layout.cols, layout.rows]).toEqual([22, 21]);
    expect(coverage).toBeGreaterThan(0.35);
    expect(coverage).toBeLessThan(0.5);
    activateLayout("maze1");
  });

  it("parses two lives, two upgrades, one enhance and one swap slot in row/col order", () => {
    expect(parseStoreSlots(STORE_MAZE_ASCII)).toEqual([
      { kind: "upgrade", col: 2, row: 2 },
      { kind: "upgrade", col: 18, row: 2 },
      { kind: "life", col: 10, row: 8 },
      { kind: "enhance", col: 4, row: 11 },
      { kind: "swap", col: 5, row: 14 },
      { kind: "life", col: 15, row: 14 },
    ]);
  });

  it("rejects a slot that is not a full 2x2 block", () => {
    expect(() => parseStoreSlots("#UU#\n#U-#")).toThrow(/2x2/);
  });
});

describe("store schedule", () => {
  it("stores after level 3, the mid level, and level 8 only", () => {
    const hits = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((level) => storeAfterLevel(level, 6));
    expect(hits).toEqual([3, 6, 8]);
  });

  it("picks 5 or 6 for the mid store", () => {
    expect(pickMidStoreLevel(() => 0)).toBe(5);
    expect(pickMidStoreLevel(() => 0.99)).toBe(6);
  });
});

describe("createStoreState", () => {
  it("offers two lives, two distinct unowned upgrades, a swap and an enhancement", () => {
    const owned: UpgradeId[] = ["passivePlayerSpeedUp"];
    const state = stateWith(owned);
    const ids = state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain("passivePlayerSpeedUp");
    expect(state.slots.filter((s) => s.kind === "life")).toHaveLength(2);
    const swap = state.slots.find((s) => s.kind === "swap");
    expect(swap).toMatchObject({ outgoingId: "passivePlayerSpeedUp", sold: false });
    const enhance = state.slots.find((s) => s.kind === "enhance");
    expect(enhance).toMatchObject({ targetId: "passivePlayerSpeedUp", sold: false });
  });

  it("the first store has only lives and abilities", () => {
    const first = createStoreState(
      parseStoreSlots(STORE_MAZE_ASCII),
      ["passivePlayerSpeedUp"],
      zeroRng,
      true,
    );
    expect(first.slots.map((s) => s.kind).sort()).toEqual(["life", "life", "upgrade", "upgrade"]);
  });

  it("omits the enhance slot when nothing owned is unenhanced", () => {
    expect(stateWith([]).slots.some((s) => s.kind === "enhance")).toBe(false);
    expect(stateWith(["passivePlayerSpeedUpPlus"]).slots.some((s) => s.kind === "enhance")).toBe(
      false,
    );
  });

  it("omits the swap slot when nothing is owned", () => {
    expect(stateWith([]).slots.some((s) => s.kind === "swap")).toBe(false);
  });

  it("omits upgrade slots that cannot be filled", () => {
    const owned = ALL_UPGRADE_IDS.slice(1);
    const upgrades = stateWith(owned).slots.filter((s) => s.kind === "upgrade");
    expect(upgrades).toHaveLength(1);
  });
});

describe("storeStep", () => {
  const lifeCell = { col: 16, row: 15 };
  const upgradeCell = { col: 2, row: 2 };
  const swapCell = { col: 5, row: 14 };

  it("opens a NO-focused prompt on arrival, dismisses on NO, and re-opens after stepping off", () => {
    let state = stateWith([]);
    state = storeStep(state, input(lifeCell), zeroRng).state;
    expect(promptView(state, 10, [])?.kind).toBe("confirm");
    expect(state.confirmYes).toBe(false);
    const declined = storeStep(state, input({ ...lifeCell, enter: true }), zeroRng);
    expect(declined.purchase).toBeNull();
    state = declined.state;
    expect(promptView(state, 10, [])).toBeNull();
    state = storeStep(state, input({ ...lifeCell, col: 15 }), zeroRng).state;
    expect(promptView(state, 10, [])).toBeNull();
    state = storeStep(state, input({ col: 13, row: 16 }), zeroRng).state;
    state = storeStep(state, input(lifeCell), zeroRng).state;
    expect(promptView(state, 10, [])?.kind).toBe("confirm");
    expect(state.confirmYes).toBe(false);
  });

  it("toggles between YES and NO", () => {
    let state = storeStep(stateWith([]), input(lifeCell), zeroRng).state;
    state = storeStep(state, input({ ...lifeCell, toggle: true }), zeroRng).state;
    expect(state.confirmYes).toBe(true);
    state = storeStep(state, input({ ...lifeCell, toggle: true }), zeroRng).state;
    expect(state.confirmYes).toBe(false);
  });

  it("sells each life tile once and removes it", () => {
    const state = storeStep(stateWith([]), input(lifeCell), zeroRng).state;
    const step = confirmYes(state, lifeCell);
    expect(step.purchase).toEqual({ kind: "life", price: STORE_LIFE_PRICE });
    expect(promptView(step.state, 10, [])).toBeNull();
    expect(storeStep(step.state, input(lifeCell), zeroRng).state.activeSlot).toBeNull();
    const other = storeStep(step.state, input({ col: 10, row: 8 }), zeroRng).state;
    expect(promptView(other, 10, [])?.kind).toBe("confirm");
  });

  it("shows no confirm and ignores keys without enough quarters", () => {
    const state = storeStep(stateWith([]), input(upgradeCell), zeroRng).state;
    const step = confirmYes(state, { ...upgradeCell, quarters: 2 });
    expect(step.purchase).toBeNull();
    expect(promptView(step.state, 2, [])?.kind).toBe("needQuarters");
  });

  it("sells an upgrade once and removes its slot", () => {
    let state = storeStep(stateWith([]), input(upgradeCell), zeroRng).state;
    const step = confirmYes(state, upgradeCell);
    expect(step.purchase).toMatchObject({ kind: "upgrade", price: STORE_UPGRADE_PRICE });
    state = step.state;
    expect(promptView(state, 10, [])).toBeNull();
    expect(storeStep(state, input(upgradeCell), zeroRng).state.activeSlot).toBeNull();
  });

  it("swaps into an unowned upgrade that is not on the shelf", () => {
    const owned: UpgradeId[] = ["passivePlayerSpeedUp"];
    const state = storeStep(stateWith(owned), input({ ...swapCell, owned }), zeroRng).state;
    const shelf = state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    const step = confirmYes(state, { ...swapCell, owned });
    expect(step.purchase).toMatchObject({
      kind: "swap",
      outgoingId: "passivePlayerSpeedUp",
      price: STORE_SWAP_PRICE,
    });
    const incoming = step.purchase?.kind === "swap" ? step.purchase.incomingId : null;
    expect(incoming).not.toBeNull();
    expect(owned).not.toContain(incoming);
    expect(shelf).not.toContain(incoming);
  });

  it("reports nothing to swap when every other upgrade is owned or on the shelf", () => {
    const shelfState = stateWith(["passivePlayerSpeedUp"]);
    const shelf = shelfState.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    const owned = ALL_UPGRADE_IDS.filter((id) => !shelf.includes(id));
    const state = storeStep(shelfState, input({ ...swapCell, owned }), zeroRng).state;
    expect(promptView(state, 10, owned)?.kind).toBe("nothingToSwap");
    const step = confirmYes(state, { ...swapCell, owned });
    expect(step.purchase).toBeNull();
  });
});

describe("enhancement tile", () => {
  const enhanceCell = { col: 4, row: 11 };
  const swapCell = { col: 5, row: 14 };

  it("costs 2 and enhances its shown target", () => {
    const owned: UpgradeId[] = ["passivePlayerSpeedUp", "passiveGhostSlow"];
    const stocked = stateWith(owned);
    const target = stocked.slots.find((s) => s.kind === "enhance");
    const state = storeStep(stocked, input({ ...enhanceCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...enhanceCell, owned });
    expect(step.purchase).toEqual({
      kind: "enhance",
      targetId: target?.kind === "enhance" ? target.targetId : null,
      price: STORE_ENHANCE_PRICE,
    });
    expect(STORE_ENHANCE_PRICE).toBe(2);
  });

  it("re-picks when the shown target is no longer unenhanced", () => {
    const stocked = stateWith(["passivePlayerSpeedUp", "passiveGhostSlow"]);
    const shown = stocked.slots.find((s) => s.kind === "enhance");
    const shownId = shown?.kind === "enhance" ? shown.targetId : null;
    const owned: UpgradeId[] = [
      shownId === "passivePlayerSpeedUp" ? "passivePlayerSpeedUpPlus" : "passivePlayerSpeedUp",
      shownId === "passiveGhostSlow" ? "passiveGhostSlowPlus" : "passiveGhostSlow",
    ];
    const state = storeStep(stocked, input({ ...enhanceCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...enhanceCell, owned });
    expect(step.purchase?.kind === "enhance" ? step.purchase.targetId : null).not.toBe(shownId);
  });

  it("relabels the swap tile when its upgrade is enhanced", () => {
    const owned: UpgradeId[] = ["passivePlayerSpeedUp"];
    const state = storeStep(stateWith(owned), input({ ...enhanceCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...enhanceCell, owned });
    const swap = step.state.slots.find((s) => s.kind === "swap");
    expect(swap).toMatchObject({ outgoingId: "passivePlayerSpeedUpPlus" });
  });

  it("reports nothing to enhance when everything owned is enhanced", () => {
    const stocked = stateWith(["passivePlayerSpeedUp"]);
    const owned: UpgradeId[] = ["passivePlayerSpeedUpPlus"];
    const state = storeStep(stocked, input({ ...enhanceCell, owned }), zeroRng).state;
    expect(promptView(state, 10, owned)?.kind).toBe("nothingToEnhance");
    expect(confirmYes(state, { ...enhanceCell, owned }).purchase).toBeNull();
  });

  it("a swap of an enhanced upgrade grants the incoming one enhanced", () => {
    const owned: UpgradeId[] = ["passivePlayerSpeedUpPlus"];
    const stocked = stateWith(owned);
    const state = storeStep(stocked, input({ ...swapCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...swapCell, owned });
    expect(step.purchase).toMatchObject({ kind: "swap", outgoingId: "passivePlayerSpeedUpPlus" });
    const incoming = step.purchase?.kind === "swap" ? step.purchase.incomingId : "";
    expect(incoming.endsWith("Plus")).toBe(true);
  });

  it("pulses its glow between a floor and a ceiling", () => {
    const alphas = [0, 200, 400, 800, 1200, 1600].map(enhanceGlowAlpha);
    expect(Math.min(...alphas)).toBeCloseTo(0.12);
    expect(Math.max(...alphas)).toBeCloseTo(0.5);
    expect(enhanceGlowAlpha(0)).toBeCloseTo(enhanceGlowAlpha(1600));
  });
});

describe("storeExitDirection", () => {
  it("points out of the border the player reached and is null inside", () => {
    expect(storeExitDirection(0, 10, 22, 21)).toEqual({ dx: -1, dy: 0 });
    expect(storeExitDirection(21, 10, 22, 21)).toEqual({ dx: 1, dy: 0 });
    expect(storeExitDirection(10, 0, 22, 21)).toEqual({ dx: 0, dy: -1 });
    expect(storeExitDirection(11, 20, 22, 21)).toEqual({ dx: 0, dy: 1 });
    expect(storeExitDirection(1, 1, 22, 21)).toBeNull();
    expect(storeExitDirection(20, 19, 22, 21)).toBeNull();
  });
});

describe("storeExitAlpha", () => {
  it("stays opaque inside the maze, then fades to zero by the end of the slide", () => {
    expect(storeExitAlpha(0)).toBe(1);
    expect(storeExitAlpha(0.5)).toBe(1);
    expect(storeExitAlpha(1.25)).toBeCloseTo(0.5);
    expect(storeExitAlpha(STORE_EXIT_SLIDE_TILES)).toBe(0);
    expect(storeExitAlpha(STORE_EXIT_SLIDE_TILES + 1)).toBe(0);
  });
});
