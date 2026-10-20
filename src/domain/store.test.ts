import { describe, expect, it } from "vitest";
import { activateAsciiLayout, activateLayout, isWalkable } from "./maze";
import { STORE_MAZE_ASCII } from "./mazeLayouts";
import {
  STORE_ENHANCE_PRICE,
  enhanceGlowAlpha,
  STORE_SWAP_PRICE,
  createStoreState,
  offeredUpgradeIds,
  STORE_EXIT_SLIDE_TILES,
  storeExitAlpha,
  storeExitDirection,
  parseStoreLayout,
  storeCorner,
  storeFocusForDir,
  sacrificeHints,
  pickMidStoreLevel,
  promptView,
  purchaseSchool,
  slotPrice,
  swapIncomingSchool,
  storeAfterLevel,
  storePanelMode,
  storeStep,
  type StoreState,
  type StoreStepInput,
} from "./store";
import {
  ALL_UPGRADE_IDS,
  RARE_OFFER_MASS,
  STORE_RARE_OFFER_MASS,
  STORE_RARE_UPGRADE_PRICE,
  STORE_UPGRADE_PRICE,
  baseIdOf,
  enhancedIdOf,
  getUpgradeDef,
  isRare,
  rareWeightForPool,
  type BaseUpgradeId,
  type UpgradeId,
} from "./upgrades";

const zeroRng = () => 0;

function input(overrides: Partial<StoreStepInput>): StoreStepInput {
  return {
    col: 16,
    row: 4,
    focus: null,
    enter: false,
    quarters: 10,
    owned: [],
    ...overrides,
  };
}

function confirmYes(state: StoreState, overrides: Partial<StoreStepInput>) {
  const toggled = storeStep(state, input({ ...overrides, focus: "yes" }), zeroRng).state;
  return storeStep(toggled, input({ ...overrides, enter: true }), zeroRng);
}

function confirmSwap(state: StoreState, overrides: Partial<StoreStepInput>) {
  const chosen = storeStep(state, input({ ...overrides, dir: "right" }), zeroRng).state;
  return storeStep(chosen, input({ ...overrides, dir: "right" }), zeroRng);
}

function stateWith(owned: readonly UpgradeId[]): StoreState {
  return createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, zeroRng);
}

describe("store layout", () => {
  it("builds with no pellets and a single open mouth on the left edge, on the spawn row", () => {
    const layout = activateAsciiLayout(STORE_MAZE_ASCII, "store");
    expect(layout.pelletCount).toBe(0);
    const borderOpen: string[] = [];
    for (let row = 0; row < layout.rows; row += 1) {
      for (let col = 0; col < layout.cols; col += 1) {
        const border = row === 0 || col === 0 || row === layout.rows - 1 || col === layout.cols - 1;
        if (border && isWalkable(col, row, layout.playerSolids)) borderOpen.push(`${col},${row}`);
      }
    }
    expect(borderOpen).toEqual([`0,${layout.playerSpawn.row}`]);
    activateLayout("maze1");
  });

  it("is single-file corridors with no ghost house", () => {
    const layout = activateAsciiLayout(STORE_MAZE_ASCII, "store");
    expect(layout.house.flat().some(Boolean)).toBe(false);
    const open = (col: number, row: number) => isWalkable(col, row, layout.playerSolids);
    for (let row = 0; row < layout.rows - 1; row += 1) {
      for (let col = 0; col < layout.cols - 1; col += 1) {
        const block =
          open(col, row) && open(col + 1, row) && open(col, row + 1) && open(col + 1, row + 1);
        expect(block).toBe(false);
      }
    }
    activateLayout("maze1");
  });

  it("reaches every item, the freebie and every dot from the spawn", () => {
    const layout = activateAsciiLayout(STORE_MAZE_ASCII, "store");
    const parsed = parseStoreLayout(STORE_MAZE_ASCII);
    const seen = new Set<string>();
    const stack = [layout.playerSpawn];
    while (stack.length > 0) {
      const { col, row } = stack.pop()!;
      if (seen.has(`${col},${row}`) || !isWalkable(col, row, layout.playerSolids)) continue;
      seen.add(`${col},${row}`);
      stack.push(
        { col: col + 1, row },
        { col: col - 1, row },
        { col, row: row + 1 },
        { col, row: row - 1 },
      );
    }
    for (const cell of [...parsed.slots, parsed.freebie, ...parsed.dots]) {
      expect(seen.has(`${cell.col},${cell.row}`)).toBe(true);
    }
    activateLayout("maze1");
  });

  it("parses one-cell upgrade, upgrade, enhance and swap corners, a centre freebie and dots", () => {
    const layout = parseStoreLayout(STORE_MAZE_ASCII);
    expect(layout.slots).toEqual([
      { kind: "upgrade", col: 13, row: 5 },
      { kind: "upgrade", col: 24, row: 7 },
      { kind: "enhance", col: 15, row: 13 },
      { kind: "swap", col: 26, row: 15 },
    ]);
    expect(layout.freebie).toEqual({ col: 18, row: 10 });
    expect(layout.dots).toHaveLength(STORE_MAZE_ASCII.split(".").length - 1);
    expect(layout.dots).not.toContainEqual(layout.freebie);
  });

  it("puts each stocked item in its own corner of the play area around the freebie", () => {
    const { slots, freebie } = parseStoreLayout(STORE_MAZE_ASCII);
    expect(slots.map((slot) => storeCorner(slot, freebie))).toEqual([
      { right: false, bottom: false },
      { right: true, bottom: false },
      { right: false, bottom: true },
      { right: true, bottom: true },
    ]);
  });

  it("rejects a store without exactly one freebie", () => {
    expect(() => parseStoreLayout("#U#\n#U#")).toThrow(/exactly one F/);
  });
});

describe("storeFocusForDir", () => {
  it("maps left to BUY and right to NEVER MIND, ignoring up and down", () => {
    expect(storeFocusForDir("left")).toBe("yes");
    expect(storeFocusForDir("right")).toBe("no");
    expect(storeFocusForDir("up")).toBeNull();
    expect(storeFocusForDir("down")).toBeNull();
    expect(storeFocusForDir(null)).toBeNull();
  });
});

describe("store dots", () => {
  it("eats a dot once on stepping onto it and changes nothing else", () => {
    const state = stateWith([]);
    const dot = state.dots[0]!;
    const first = storeStep(state, input({ col: dot.col, row: dot.row }), zeroRng);
    expect(first.dotPicked).toBe(true);
    expect(first.state.dots).toHaveLength(state.dots.length - 1);
    expect(first.state.dots).not.toContainEqual(dot);
    expect(first.purchase).toBeNull();
    expect(first.pickup).toBeNull();
    const again = storeStep(first.state, input({ col: dot.col, row: dot.row }), zeroRng);
    expect(again.dotPicked).toBe(false);
    expect(again.state.dots).toHaveLength(first.state.dots.length);
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
    const owned: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow"];
    const state = stateWith(owned);
    expect(state.slots.map((s) => s.kind)).toEqual(["upgrade", "upgrade", "enhance", "swap"]);
    const ids = state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain("passiveAfterburner");
    const swap = state.slots.find((s) => s.kind === "swap");
    expect(swap).toMatchObject({ sold: false });
    const enhance = state.slots.find((s) => s.kind === "enhance");
    expect(enhance).toMatchObject({ sold: false });
  });

  it("never targets the same upgrade with both the swap and the enhancement", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      let x = seed;
      const rng = () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
      };
      const state = createStoreState(
        parseStoreLayout(STORE_MAZE_ASCII),
        ["passiveAfterburner", "passiveGhostSlow", "fruitFeast"],
        rng,
      );
      const swap = state.slots.find((s) => s.kind === "swap");
      const enhance = state.slots.find((s) => s.kind === "enhance");
      if (swap?.kind !== "swap" || enhance?.kind !== "enhance") throw new Error("missing tile");
      expect(baseIdOf(swap.outgoingId)).not.toBe(enhance.targetId);
    }
  });

  it("never re-offers an upgrade from previouslyOffered on any tile while a fresh enhance target exists", () => {
    const owned: UpgradeId[] = ["passiveAfterburner", "passiveGhostSlow", "fruitFeast"];
    for (let seed = 1; seed <= 100; seed += 1) {
      let x = seed;
      const rng = () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
      };
      const first = createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, rng);
      const seen = offeredUpgradeIds(first);
      const second = createStoreState(
        parseStoreLayout(STORE_MAZE_ASCII),
        owned,
        rng,
        false,
        true,
        null,
        seen,
      );
      expect(offeredUpgradeIds(second).filter((id) => seen.includes(id))).toEqual([]);
    }
  });

  it("repeats an enhance target only when every enhanceable upgrade was already offered", () => {
    const stocked = createStoreState(
      parseStoreLayout(STORE_MAZE_ASCII),
      ["passiveAfterburner"],
      zeroRng,
      false,
      true,
      null,
      ["passiveAfterburner"],
    );
    expect(stocked.slots.find((s) => s.kind === "enhance")).toMatchObject({
      targetId: "passiveAfterburner",
    });
  });

  it("omits the swap when the only tradeable upgrade is the enhancement target", () => {
    const state = stateWith(["passiveAfterburner"]);
    expect(state.slots.some((s) => s.kind === "enhance")).toBe(true);
    expect(state.slots.some((s) => s.kind === "swap")).toBe(false);
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

  it("shelves a rare at half the level-clear rare mass", () => {
    const left: UpgradeId[] = [
      "passiveStreakEngine",
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
      withRare += state.slots.some((s) => s.kind === "upgrade" && s.id === "passiveStreakEngine")
        ? 1
        : 0;
    }
    const w = rareWeightForPool(left as BaseUpgradeId[], STORE_RARE_OFFER_MASS);
    const expected = w / (3 + w) + (3 / (3 + w)) * (w / (2 + w));
    expect(Math.abs(withRare / draws - expected)).toBeLessThan(0.03);
    expect(STORE_RARE_OFFER_MASS).toBe(RARE_OFFER_MASS / 2);
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
    expect(freebie(true)).toEqual({ kind: "life", col: 18, row: 10, taken: false });
    expect(freebie(false)).toEqual({ kind: "quarter", col: 18, row: 10, taken: false });
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
  const upgradeCell = { col: 13, row: 5 };
  const swapCell = { col: 26, row: 15 };
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

  it("focuses BUY on left and NEVER MIND on right, staying put on repeats", () => {
    let state = storeStep(stateWith([]), input(upgradeCell), zeroRng).state;
    state = storeStep(state, input({ ...upgradeCell, focus: "yes" }), zeroRng).state;
    expect(state.confirmYes).toBe(true);
    state = storeStep(state, input({ ...upgradeCell, focus: "yes" }), zeroRng).state;
    expect(state.confirmYes).toBe(true);
    state = storeStep(state, input({ ...upgradeCell, focus: "no" }), zeroRng).state;
    expect(state.confirmYes).toBe(false);
    state = storeStep(state, input({ ...upgradeCell, focus: "no" }), zeroRng).state;
    expect(state.confirmYes).toBe(false);
  });

  it("hands over the centre freebie once on stepping onto it", () => {
    const freebie = { col: 18, row: 10 };
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
    const owned: UpgradeId[] = ["passiveGhostSlow", "passiveAfterburner"];
    const state = storeStep(stateWith(owned), input({ ...swapCell, owned }), zeroRng).state;
    const shelf = state.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    const step = confirmSwap(state, { ...swapCell, owned });
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
    const owned: UpgradeId[] = ["passiveGhostSlow", "passiveAfterburner"];
    for (let seed = 1; seed <= 40; seed += 1) {
      let x = seed;
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
      const stocked = createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, rng);
      const swap = stocked.slots.find((s) => s.kind === "swap");
      if (swap?.kind !== "swap") throw new Error("no swap slot");
      const state = storeStep(stocked, input({ ...swapCell, owned }), rng).state;
      const bought = confirmSwap(state, { ...swapCell, owned }).purchase;
      if (bought?.kind !== "swap") throw new Error("no swap purchase");
      expect(swapIncomingSchool(swap)).toBe(getUpgradeDef(bought.incomingId).school);
    }
  });

  it("never swaps into a specialist the swap itself leaves below three", () => {
    const owned: UpgradeId[] = ["passiveMoneyTalks", "passiveDefyDeath", "passiveMyogenesis"];
    const arrived = storeStep(stateWith(owned), input({ ...swapCell, owned }), zeroRng).state;
    const staged = storeStep(arrived, input({ ...swapCell, owned, dir: "right" }), zeroRng).state;
    const step = storeStep(staged, input({ ...swapCell, owned, dir: "right" }), () => 0.9999);
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
    const step = confirmSwap(arrived, { ...swapCell, owned });
    const incoming = step.purchase?.kind === "swap" ? step.purchase.incomingId : null;
    expect(incoming !== null && isRare(incoming)).toBe(true);
    expect(shelf).not.toContain(incoming);
  });

  it("reports nothing to swap when every other upgrade is owned or on the shelf", () => {
    const shelfState = stateWith(["passiveGhostSlow", "passiveAfterburner"]);
    const shelf = shelfState.slots.flatMap((s) => (s.kind === "upgrade" ? [s.id] : []));
    const owned = ALL_UPGRADE_IDS.filter((id) => !shelf.includes(id));
    const state = storeStep(shelfState, input({ ...swapCell, owned }), zeroRng).state;
    expect(promptView(state, 10, owned)?.kind).toBe("nothingToSwap");
    const step = confirmSwap(state, { ...swapCell, owned });
    expect(step.purchase).toBeNull();
  });
});

describe("sacrifice selection", () => {
  const swapCell = { col: 26, row: 15 };
  const owned: UpgradeId[] = ["passiveGhostSlow", "passiveAfterburner", "passiveMoneyTalks"];
  const arrive = () => storeStep(stateWith(owned), input({ ...swapCell, owned }), zeroRng).state;
  const press = (state: StoreState, dir: StoreStepInput["dir"]) =>
    storeStep(state, input({ ...swapCell, owned, dir }), zeroRng);

  it("starts on the stocked power and steps back on up and forward on down, wrapping", () => {
    let state = arrive();
    expect(state.sacrifice).toEqual({ id: "passiveAfterburner", stage: "power" });
    state = press(state, "up").state;
    expect(state.sacrifice?.id).toBe("passiveGhostSlow");
    state = press(state, "up").state;
    expect(state.sacrifice?.id).toBe("passiveMoneyTalks");
    state = press(state, "down").state;
    expect(state.sacrifice?.id).toBe("passiveGhostSlow");
  });

  it("sells the selected power, not the stocked one", () => {
    let state = press(arrive(), "up").state;
    state = press(state, "right").state;
    expect(state.sacrifice?.stage).toBe("school");
    const step = press(state, "right");
    expect(step.purchase).toMatchObject({ kind: "swap", outgoingId: "passiveGhostSlow" });
  });

  it("ignores up and down on the school stage and goes back to the power on left", () => {
    let state = press(arrive(), "right").state;
    state = press(state, "up").state;
    expect(state.sacrifice).toEqual({ id: "passiveAfterburner", stage: "school" });
    state = press(state, "left").state;
    expect(state.sacrifice).toEqual({ id: "passiveAfterburner", stage: "power" });
  });

  it("leaves the selection on left from the power stage without buying", () => {
    const step = press(arrive(), "left");
    expect(step.purchase).toBeNull();
    expect(promptView(step.state, 10, owned)).toBeNull();
  });

  it("confirms with Enter on the school stage only", () => {
    const staged = storeStep(arrive(), input({ ...swapCell, owned, enter: true }), zeroRng);
    expect(staged.purchase).toBeNull();
    expect(staged.state.sacrifice?.stage).toBe("school");
    const bought = storeStep(staged.state, input({ ...swapCell, owned, enter: true }), zeroRng);
    expect(bought.purchase).toMatchObject({ kind: "swap" });
  });

  it("restarts on the stocked power when the tile is re-entered", () => {
    let state = press(arrive(), "up").state;
    state = storeStep(state, input({ col: 5, row: 1, owned }), zeroRng).state;
    state = storeStep(state, input({ ...swapCell, owned }), zeroRng).state;
    expect(state.sacrifice).toEqual({ id: "passiveAfterburner", stage: "power" });
  });

  it("gains the school the tile promised even when the sacrificed power changes the pool", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      let x = seed;
      const rng = () => ((x = (x * 16807) % 2147483647) - 1) / 2147483646;
      const stocked = createStoreState(parseStoreLayout(STORE_MAZE_ASCII), owned, rng);
      const swap = stocked.slots.find((s) => s.kind === "swap");
      if (swap?.kind !== "swap") throw new Error("no swap slot");
      let state = storeStep(stocked, input({ ...swapCell, owned }), rng).state;
      state = storeStep(state, input({ ...swapCell, owned, dir: "up" }), rng).state;
      state = storeStep(state, input({ ...swapCell, owned, dir: "right" }), rng).state;
      const bought = storeStep(state, input({ ...swapCell, owned, dir: "right" }), rng).purchase;
      if (bought?.kind !== "swap") throw new Error("no swap purchase");
      expect(getUpgradeDef(bought.incomingId).school).toBe(swapIncomingSchool(swap));
    }
  });

  it("reports nothing to swap when nothing is owned", () => {
    const stocked = stateWith(["passiveGhostSlow", "passiveAfterburner"]);
    const state = storeStep(stocked, input({ ...swapCell, owned: [] }), zeroRng).state;
    expect(promptView(state, 10, [])?.kind).toBe("nothingToSwap");
  });

  it("labels the hints per stage", () => {
    expect(sacrificeHints("power")).toEqual({ vertical: true, left: "BACK", right: "BUY" });
    expect(sacrificeHints("school")).toEqual({ vertical: false, left: "BACK", right: "CONFIRM" });
  });
});

describe("storePanelMode", () => {
  const upgradeCell = { col: 13, row: 5 };
  const modes = (state: StoreState, quarters: number) =>
    state.slots.map((_, i) => storePanelMode(state, promptView(state, quarters, []), i));

  it("leaves every panel idle until a corner is stepped on", () => {
    expect(modes(stateWith([]), 10)).toEqual(["idle", "idle", "idle", "idle"]);
  });

  it("offers the choice on the active panel and dims the other three", () => {
    const state = storeStep(stateWith([]), input(upgradeCell), zeroRng).state;
    expect(modes(state, 10)).toEqual(["choosing", "dimmed", "dimmed", "dimmed"]);
  });

  it("shows only info on an unaffordable active panel, and goes idle after NEVER MIND", () => {
    const poor = storeStep(stateWith([]), input({ ...upgradeCell, quarters: 0 }), zeroRng).state;
    expect(modes(poor, 0)).toEqual(["info", "dimmed", "dimmed", "dimmed"]);
    const arrived = storeStep(stateWith([]), input(upgradeCell), zeroRng).state;
    const declined = storeStep(arrived, input({ ...upgradeCell, pick: "no" }), zeroRng).state;
    expect(modes(declined, 10)).toEqual(["idle", "idle", "idle", "idle"]);
  });
});

describe("enhancement tile", () => {
  const enhanceCell = { col: 15, row: 13 };
  const swapCell = { col: 26, row: 15 };

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
    const stocked = stateWith(["passiveAfterburner", "passiveGhostSlow"]);
    const target = stocked.slots.find((s) => s.kind === "enhance");
    const swap = stocked.slots.find((s) => s.kind === "swap");
    if (target?.kind !== "enhance" || swap?.kind !== "swap") throw new Error("missing tile");
    const owned: UpgradeId[] = [enhancedIdOf(target.targetId), swap.outgoingId];
    const state = storeStep(stocked, input({ ...enhanceCell, owned }), zeroRng).state;
    const step = confirmYes(state, { ...enhanceCell, owned });
    expect(step.state.slots.find((s) => s.kind === "swap")).toMatchObject({
      outgoingId: enhancedIdOf(baseIdOf(swap.outgoingId)),
    });
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
    const step = confirmSwap(state, { ...swapCell, owned });
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
