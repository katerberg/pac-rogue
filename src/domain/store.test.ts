import { describe, expect, it } from "vitest";
import { activateAsciiLayout, activateLayout, isWalkable } from "./maze";
import { STORE_MAZE_ASCII } from "./mazeLayouts";
import {
  STORE_ENHANCE_PRICE,
  enhanceGlowAlpha,
  STORE_SWAP_PRICE,
  createStoreState,
  STORE_EXIT_SLIDE_TILES,
  storeExitAlpha,
  storeExitDirection,
  parseStoreLayout,
  pickMidStoreLevel,
  promptView,
  purchaseSchool,
  slotPrice,
  swapIncomingSchool,
  storeAfterLevel,
  storeStep,
  type StoreState,
  type StoreStepInput,
} from "./store";
import {
  ALL_UPGRADE_IDS,
  STORE_RARE_UPGRADE_PRICE,
  STORE_UPGRADE_PRICE,
  getUpgradeDef,
  isRare,
  type UpgradeId,
} from "./upgrades";

const zeroRng = () => 0;

function input(overrides: Partial<StoreStepInput>): StoreStepInput {
  return {
    col: 15,
    row: 5,
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
  return createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, zeroRng);
}

describe("store layout", () => {
  it("builds with no pellets and opens exits only at both ends of the spawn row", () => {
    const layout = activateAsciiLayout(STORE_MAZE_ASCII, "store");
    expect(layout.pelletCount).toBe(0);
    const borderOpen: string[] = [];
    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        const border = row === 0 || col === 0 || row === layout.rows - 1 || col === layout.cols - 1;
        if (border && isWalkable(col, row, layout.playerSolids)) borderOpen.push(`${col},${row}`);
      }
    }
    const row = layout.playerSpawn.row;
    expect(borderOpen).toEqual([`0,${row}`, `${layout.cols - 1},${row}`]);
    activateLayout("maze1");
  });

  it("is single-file corridors with no ghost house", () => {
    const layout = activateAsciiLayout(STORE_MAZE_ASCII, "store");
    expect(layout.house.flat().some(Boolean)).toBe(false);
    const open = (col: number, row: number) => layout.walls[row]?.[col] === false;
    const slots = parseStoreLayout(STORE_MAZE_ASCII).slots;
    const inSlot = (col: number, row: number) =>
      slots.some((s) => col >= s.col && col <= s.col + 1 && row >= s.row && row <= s.row + 1);
    for (let row = 0; row < layout.rows - 1; row += 1) {
      for (let col = 0; col < layout.cols - 1; col += 1) {
        const block = open(col, row) && open(col + 1, row) && open(col, row + 1);
        expect(block && open(col + 1, row + 1) && !inSlot(col, row)).toBe(false);
      }
    }
    activateLayout("maze1");
  });

  it("parses upgrade, upgrade, enhance and swap corners and a centre freebie", () => {
    expect(parseStoreLayout(STORE_MAZE_ASCII)).toEqual({
      slots: [
        { kind: "upgrade", col: 1, row: 1 },
        { kind: "upgrade", col: 28, row: 1 },
        { kind: "enhance", col: 1, row: 32 },
        { kind: "swap", col: 28, row: 32 },
      ],
      freebie: { col: 15, row: 17 },
    });
  });

  it("rejects a slot that is not a full 2x2 block, or a missing freebie", () => {
    expect(() => parseStoreLayout("#UU#\n#U-#")).toThrow(/2x2/);
    expect(() => parseStoreLayout("#UU#\n#UU#")).toThrow(/exactly one F/);
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
  it("offers two distinct unowned upgrades, an enhancement and a swap", () => {
    const owned: UpgradeId[] = ["passiveAfterburner"];
    const state = stateWith(owned);
    expect(state.slots.map((s) => s.kind)).toEqual(["upgrade", "upgrade", "enhance", "swap"]);
    const ids = state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain("passiveAfterburner");
    const swap = state.slots.find((s) => s.kind === "swap");
    expect(swap).toMatchObject({ outgoingId: "passiveAfterburner", sold: false });
    const enhance = state.slots.find((s) => s.kind === "enhance");
    expect(enhance).toMatchObject({ targetId: "passiveAfterburner", sold: false });
  });

  it("shelves at most one rare, priced 4", () => {
    const owned: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];
    let shelvedRare = 0;
    for (let seed = 1; seed <= 200; seed += 1) {
      let x = seed;
      const rng = () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
      };
      const state = createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, rng);
      const rares = state.slots.filter((s) => s.kind === "upgrade" && isRare(s.id));
      expect(rares.length).toBeLessThanOrEqual(1);
      for (const slot of rares) {
        expect(slotPrice(slot)).toBe(STORE_RARE_UPGRADE_PRICE);
      }
      shelvedRare += rares.length;
    }
    expect(shelvedRare).toBeGreaterThan(0);
  });

  it("shelves a rare at half a common's weight", () => {
    const left: UpgradeId[] = [
      "passiveMartyr",
      "passiveGhostSlow",
      "passiveAfterburner",
      "fruitFeast",
    ];
    const owned = ALL_UPGRADE_IDS.filter((id) => !left.includes(id));
    let x = 11;
    const rng = () => {
      x = (x * 1103515245 + 12345) % 2147483648;
      return x / 2147483648;
    };
    const draws = 4000;
    let withRare = 0;
    for (let i = 0; i < draws; i += 1) {
      const state = createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, rng);
      withRare += state.slots.some((s) => s.kind === "upgrade" && s.id === "passiveMartyr") ? 1 : 0;
    }
    const expected = 0.5 / 3.5 + (3 / 3.5) * (0.5 / 2.5);
    expect(Math.abs(withRare / draws - expected)).toBeLessThan(0.03);
  });

  it("shelves no rare before two upgrades are owned", () => {
    for (const owned of [[], ["passiveAfterburner"]] as UpgradeId[][]) {
      const state = createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, () => 0.999);
      expect(state.slots.some((s) => s.kind === "upgrade" && isRare(s.id))).toBe(false);
    }
  });

  it("the first store fills the swap corner with another upgrade", () => {
    const first = createStoreState(
      parseStoreLayout(STORE_MAZE_ASCII),
      ["passiveAfterburner"],
      zeroRng,
      true,
    );
    expect(first.slots.map((s) => s.kind)).toEqual(["upgrade", "upgrade", "enhance", "upgrade"]);
  });

  it("fills the enhance and swap corners with distinct upgrades when nothing is owned", () => {
    const state = stateWith([]);
    expect(state.slots.map((s) => s.kind)).toEqual(["upgrade", "upgrade", "upgrade", "upgrade"]);
    const ids = state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    expect(new Set(ids).size).toBe(4);
  });

  it("fills the enhance corner with an upgrade when everything owned is enhanced", () => {
    const kinds = stateWith(["passiveAfterburnerPlus"]).slots.map((s) => s.kind);
    expect(kinds).toEqual(["upgrade", "upgrade", "upgrade", "swap"]);
  });

  it("stocks a free life in the centre when there is life room, else a free quarter", () => {
    const freebie = (room: boolean) =>
      createStoreState(parseStoreLayout(STORE_MAZE_ASCII), [], zeroRng, false, room).freebie;
    expect(freebie(true)).toEqual({ kind: "life", col: 15, row: 17, taken: false });
    expect(freebie(false)).toEqual({ kind: "quarter", col: 15, row: 17, taken: false });
  });

  it("omits upgrade slots that cannot be filled", () => {
    const owned = ALL_UPGRADE_IDS.slice(1);
    const upgrades = stateWith(owned).slots.filter((s) => s.kind === "upgrade");
    expect(upgrades).toHaveLength(1);
  });
});

describe("createStoreState school guarantee", () => {
  const upgradeIds = (state: StoreState) =>
    state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));

  it("shelves an upgrade of the guaranteed school and no duplicates", () => {
    for (const school of ["speed", "harvest", "death", "protection"] as const) {
      for (let seed = 1; seed <= 40; seed += 1) {
        let x = seed;
        const rng = () => {
          x = (x * 1103515245 + 12345) % 2147483648;
          return x / 2147483648;
        };
        const state = createStoreState(
          parseStoreLayout(STORE_MAZE_ASCII),
          [],
          rng,
          false,
          true,
          school,
        );
        const ids = upgradeIds(state);
        expect(ids.some((id) => getUpgradeDef(id).school === school)).toBe(true);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.filter(isRare).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it("skips the guarantee when the school has nothing left to offer", () => {
    const owned = ALL_UPGRADE_IDS.filter((id) => getUpgradeDef(id).school === "speed");
    const state = createStoreState(
      parseStoreLayout(STORE_MAZE_ASCII),
      owned,
      zeroRng,
      false,
      true,
      "speed",
    );
    expect(upgradeIds(state).every((id) => getUpgradeDef(id).school !== "speed")).toBe(true);
  });
});

describe("purchaseSchool", () => {
  it("reads the school of a bought or enhanced upgrade and ignores random trades", () => {
    expect(
      purchaseSchool({
        kind: "swap",
        outgoingId: "passiveGhostSlow",
        incomingId: "passiveAfterburnerPlus",
        price: 1,
      }),
    ).toBeNull();
    expect(purchaseSchool({ kind: "upgrade", id: "passiveAfterburner", price: 2 })).toBe(
      getUpgradeDef("passiveAfterburner").school,
    );
    expect(purchaseSchool({ kind: "enhance", targetId: "passiveGhostSlow", price: 2 })).toBe(
      getUpgradeDef("passiveGhostSlow").school,
    );
  });
});

describe("storeStep", () => {
  const upgradeCell = { col: 2, row: 2 };
  const swapCell = { col: 28, row: 32 };
  const away = { col: 5, row: 1 };

  it("opens a NO-focused prompt on arrival, dismisses on NO, and re-opens after stepping off", () => {
    let state = stateWith([]);
    state = storeStep(state, input(upgradeCell), zeroRng).state;
    expect(promptView(state, 10, [])?.kind).toBe("confirm");
    expect(state.confirmYes).toBe(false);
    const declined = storeStep(state, input({ ...upgradeCell, enter: true }), zeroRng);
    expect(declined.purchase).toBeNull();
    state = declined.state;
    expect(promptView(state, 10, [])).toBeNull();
    state = storeStep(state, input({ ...upgradeCell, col: 1 }), zeroRng).state;
    expect(promptView(state, 10, [])).toBeNull();
    state = storeStep(state, input(away), zeroRng).state;
    state = storeStep(state, input(upgradeCell), zeroRng).state;
    expect(promptView(state, 10, [])?.kind).toBe("confirm");
    expect(state.confirmYes).toBe(false);
  });

  it("opens a clicked slot's prompt away from it, and buys on YES", () => {
    const state = stateWith([]);
    const idx = state.slots.findIndex((slot) => slot.kind === "upgrade");
    let step = storeStep(state, input({ ...away, click: idx }), zeroRng);
    expect(promptView(step.state, 10, [])?.slot).toBe(state.slots[idx]);
    step = storeStep(step.state, input({ ...away, moving: true }), zeroRng);
    expect(promptView(step.state, 10, [])?.kind).toBe("confirm");
    step = storeStep(step.state, input({ ...away, pick: "yes" }), zeroRng);
    expect(step.purchase).toMatchObject({ kind: "upgrade" });
    expect(step.state.clickedSlot).toBeNull();
  });

  it("closes a clicked slot's prompt on NO, and drops a clicked unaffordable one on movement", () => {
    const state = stateWith([]);
    const idx = state.slots.findIndex((slot) => slot.kind === "upgrade");
    let step = storeStep(state, input({ ...away, click: idx }), zeroRng);
    step = storeStep(step.state, input({ ...away, pick: "no" }), zeroRng);
    expect(promptView(step.state, 10, [])).toBeNull();
    expect(step.state.clickedSlot).toBeNull();

    step = storeStep(state, input({ ...away, click: idx, quarters: 0 }), zeroRng);
    expect(promptView(step.state, 0, [])?.kind).toBe("needQuarters");
    step = storeStep(step.state, input({ ...away, quarters: 0, moving: true }), zeroRng);
    expect(promptView(step.state, 0, [])).toBeNull();
  });

  it("keeps the standing slot dismissed after a click elsewhere, and a click reopens it", () => {
    const state = stateWith([]);
    let step = storeStep(state, input(upgradeCell), zeroRng);
    step = storeStep(step.state, input({ ...upgradeCell, pick: "no" }), zeroRng);
    expect(promptView(step.state, 10, [])).toBeNull();

    let other = storeStep(step.state, input({ ...upgradeCell, click: 1 }), zeroRng);
    other = storeStep(other.state, input({ ...upgradeCell, pick: "no" }), zeroRng);
    expect(promptView(other.state, 10, [])).toBeNull();
    other = storeStep(other.state, input(upgradeCell), zeroRng);
    expect(promptView(other.state, 10, [])).toBeNull();

    const reopened = storeStep(step.state, input({ ...upgradeCell, click: 0 }), zeroRng);
    expect(promptView(reopened.state, 10, [])?.kind).toBe("confirm");
  });

  it("toggles between YES and NO", () => {
    let state = storeStep(stateWith([]), input(upgradeCell), zeroRng).state;
    state = storeStep(state, input({ ...upgradeCell, toggle: true }), zeroRng).state;
    expect(state.confirmYes).toBe(true);
    state = storeStep(state, input({ ...upgradeCell, toggle: true }), zeroRng).state;
    expect(state.confirmYes).toBe(false);
  });

  it("hands over the centre freebie once on stepping onto it", () => {
    const freebie = { col: 15, row: 17 };
    const step = storeStep(stateWith([]), input(freebie), zeroRng);
    expect(step.pickup).toBe("life");
    expect(step.purchase).toBeNull();
    expect(step.state.freebie.taken).toBe(true);
    expect(storeStep(step.state, input(freebie), zeroRng).pickup).toBeNull();
    expect(storeStep(stateWith([]), input(away), zeroRng).pickup).toBeNull();
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
    const owned: UpgradeId[] = ["passiveAfterburner"];
    const state = storeStep(stateWith(owned), input({ ...swapCell, owned }), zeroRng).state;
    const shelf = state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    const step = confirmYes(state, { ...swapCell, owned });
    expect(step.purchase).toMatchObject({
      kind: "swap",
      outgoingId: "passiveAfterburner",
      price: STORE_SWAP_PRICE,
    });
    const incoming = step.purchase?.kind === "swap" ? step.purchase.incomingId : null;
    expect(incoming).not.toBeNull();
    expect(owned).not.toContain(incoming);
    expect(shelf).not.toContain(incoming);
  });

  it("swaps into the upgrade whose school the tile showed", () => {
    const owned: UpgradeId[] = ["passiveAfterburner"];
    for (let seed = 1; seed <= 40; seed += 1) {
      let x = seed;
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
      const stocked = createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, rng);
      const swap = stocked.slots.find((s) => s.kind === "swap");
      if (swap?.kind !== "swap") throw new Error("no swap slot");
      const state = storeStep(stocked, input({ ...swapCell, owned }), rng).state;
      const bought = confirmYes(state, { ...swapCell, owned }).purchase;
      if (bought?.kind !== "swap") throw new Error("no swap purchase");
      expect(swapIncomingSchool(swap)).toBe(getUpgradeDef(bought.incomingId).school);
    }
  });

  it("never swaps into a specialist the swap itself leaves below three", () => {
    const owned: UpgradeId[] = ["passiveDefyDeath", "passiveMoneyTalks", "passiveMyogenesis"];
    const arrived = storeStep(stateWith(owned), input({ ...swapCell, owned }), zeroRng).state;
    const toggled = storeStep(arrived, input({ ...swapCell, owned, toggle: true }), zeroRng).state;
    const step = storeStep(toggled, input({ ...swapCell, owned, enter: true }), () => 0.9999);
    expect(step.purchase).toMatchObject({ kind: "swap", outgoingId: "passiveDefyDeath" });
    expect(step.purchase?.kind === "swap" && step.purchase.incomingId).not.toBe(
      "passiveDeathSpecialist",
    );
  });

  it("trades into a rare even when the shelf already shows one", () => {
    const owned = ALL_UPGRADE_IDS.filter((id) => !isRare(id));
    const arrived = storeStep(stateWith(owned), input({ ...swapCell, owned }), zeroRng).state;
    const shelf = arrived.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    expect(shelf.filter(isRare)).toHaveLength(1);
    const step = confirmYes(arrived, { ...swapCell, owned });
    const incoming = step.purchase?.kind === "swap" ? step.purchase.incomingId : null;
    expect(incoming !== null && isRare(incoming)).toBe(true);
    expect(shelf).not.toContain(incoming);
  });

  it("reports nothing to swap when every other upgrade is owned or on the shelf", () => {
    const shelfState = stateWith(["passiveAfterburner"]);
    const shelf = shelfState.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    const owned = ALL_UPGRADE_IDS.filter((id) => !shelf.includes(id));
    const state = storeStep(shelfState, input({ ...swapCell, owned }), zeroRng).state;
    expect(promptView(state, 10, owned)?.kind).toBe("nothingToSwap");
    const step = confirmYes(state, { ...swapCell, owned });
    expect(step.purchase).toBeNull();
  });
});

describe("enhancement tile", () => {
  const enhanceCell = { col: 1, row: 32 };
  const swapCell = { col: 28, row: 32 };

  it("costs 2 and enhances its shown target", () => {
    const owned: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];
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
    const stocked = stateWith(["passiveAfterburner", "passiveGhostSlow"]);
    const shown = stocked.slots.find((s) => s.kind === "enhance");
    const shownId = shown?.kind === "enhance" ? shown.targetId : null;
    const owned: UpgradeId[] = [
      shownId === "passiveAfterburner" ? "passiveAfterburnerPlus" : "passiveAfterburner",
      shownId === "passiveGhostSlow" ? "passiveGhostSlowPlus" : "passiveGhostSlow",
    ];
    const state = storeStep(stocked, input({ ...enhanceCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...enhanceCell, owned });
    expect(step.purchase?.kind === "enhance" ? step.purchase.targetId : null).not.toBe(shownId);
  });

  it("relabels the swap tile when its upgrade is enhanced", () => {
    const owned: UpgradeId[] = ["passiveAfterburner"];
    const state = storeStep(stateWith(owned), input({ ...enhanceCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...enhanceCell, owned });
    const swap = step.state.slots.find((s) => s.kind === "swap");
    expect(swap).toMatchObject({ outgoingId: "passiveAfterburnerPlus" });
  });

  it("reports nothing to enhance when everything owned is enhanced", () => {
    const stocked = stateWith(["passiveAfterburner"]);
    const owned: UpgradeId[] = ["passiveAfterburnerPlus"];
    const state = storeStep(stocked, input({ ...enhanceCell, owned }), zeroRng).state;
    expect(promptView(state, 10, owned)?.kind).toBe("nothingToEnhance");
    expect(confirmYes(state, { ...enhanceCell, owned }).purchase).toBeNull();
  });

  it("a swap of an enhanced upgrade grants the incoming one enhanced", () => {
    const owned: UpgradeId[] = ["passiveAfterburnerPlus"];
    const stocked = stateWith(owned);
    const state = storeStep(stocked, input({ ...swapCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...swapCell, owned });
    expect(step.purchase).toMatchObject({ kind: "swap", outgoingId: "passiveAfterburnerPlus" });
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
