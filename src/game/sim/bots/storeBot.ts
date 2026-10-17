import { cellCenterX, cellCenterY } from "../../../domain/maze";
import { promptView, slotPrice, type StoreSlot } from "../../../domain/store";
import { enhanceableUpgrades, type UpgradeId } from "../../../domain/upgrades";
import { Position } from "../../components/Position";
import type { PlaySim } from "../playSim";
import type { SimInput } from "../simInput";
import { bfs } from "./navigate";
import { cellOf, playerEid, type Observer } from "./observe";
import { upgradeScore } from "./pick";
import type { Persona } from "./profiles";

const STORE_STALL_MS = 30_000;

function pickStoreSlot(
  slots: readonly StoreSlot[],
  skip: ReadonlySet<number>,
  quarters: number,
  owned: readonly UpgradeId[],
  persona: Persona,
  rng: () => number,
): number | null {
  const open = slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot, index }) => !slot.sold && !skip.has(index) && slot.kind !== "swap");
  const spendable = quarters - persona.store.reserveQuarters;
  if (persona.randomPicks) {
    const affordable = open.filter(({ slot }) => slotPrice(slot) <= quarters);
    return affordable.length === 0
      ? null
      : affordable[Math.floor(rng() * affordable.length)]!.index;
  }
  let best: number | null = null;
  let bestScore = 0;
  for (const { slot, index } of open) {
    if (slot.kind !== "upgrade" || slotPrice(slot) > spendable) {
      continue;
    }
    const score = upgradeScore(slot.id, owned, persona);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  }
  if (best !== null) {
    return best;
  }
  const enhance = open.find(
    ({ slot }) =>
      slot.kind === "enhance" &&
      persona.store.enhance &&
      enhanceableUpgrades(owned).length > 0 &&
      slotPrice(slot) <= spendable,
  );
  return enhance?.index ?? null;
}

export class StoreBot {
  purchases = 0;
  stalled = false;
  private elapsedMs = 0;
  private target: number | null = null;
  private readonly skip = new Set<number>();

  constructor(
    private readonly persona: Persona,
    private readonly rng: () => number,
    private readonly observer: Observer,
  ) {}

  input(sim: PlaySim, deltaMs: number): Partial<SimInput> {
    this.elapsedMs += deltaMs;
    this.stalled ||= this.elapsedMs > STORE_STALL_MS;
    const store = sim.storeState();
    if (store === null || !sim.readsStoreKeys()) {
      return {};
    }
    const hud = sim.hud();
    const prompt = promptView(store, hud.quarters, hud.upgrades);
    if (prompt?.kind === "confirm") {
      const yes = store.activeSlot === this.target;
      if (yes) {
        this.purchases += 1;
        this.skip.add(this.target!);
        this.target = null;
      }
      return { storeChoice: yes ? "yes" : "no" };
    }
    if (this.target !== null) {
      this.skip.add(this.target);
      this.target = null;
    }
    if (this.purchases < this.persona.store.maxPurchases && !this.stalled) {
      const next = pickStoreSlot(
        store.slots,
        this.skip,
        hud.quarters,
        hud.upgrades,
        this.persona,
        this.rng,
      );
      if (next !== null) {
        this.target = next;
        return { storeClick: next };
      }
    }
    return sim.storeRouting() ? {} : { storePointer: this.exitPoint(sim) };
  }

  private exitPoint(sim: PlaySim): { x: number; y: number } | null {
    const { grid, tunnels } = this.observer.grid(false);
    const eid = playerEid(sim.world);
    const from =
      eid === undefined ? null : cellOf(grid, Position.x[eid] ?? 0, Position.y[eid] ?? 0);
    if (from === null || tunnels.length === 0) {
      return null;
    }
    const dist = bfs(grid, from);
    const farthest = sim.storeState()?.freebie.taken === false;
    let best = tunnels[0]!;
    for (const cell of tunnels) {
      const closer = dist[cell]! < dist[best]!;
      if (dist[cell]! >= 0 && (dist[best]! < 0 || closer !== farthest)) {
        best = cell;
      }
    }
    return { x: cellCenterX(best % grid.cols), y: cellCenterY(Math.floor(best / grid.cols)) };
  }
}
