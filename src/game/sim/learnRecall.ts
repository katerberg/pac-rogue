import { query, type World } from "bitecs";
import {
  createGhostReleaseClock,
  tickGhostRelease,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import { GHOST_PHASE } from "../../domain/ghostPhase";
import {
  ghostHouseReleaseDelayAddMs,
  ghostHouseReliefPelletAdd,
  type UpgradeId,
} from "../../domain/upgrades";
import { Ghost } from "../components/Ghost";
import { GhostPhase } from "../components/GhostPhase";
import { ghostHouseSeating } from "../systems/ghostHouseSeating";
import { recallClosestGhostToHouse, sendGhostToHouse } from "../systems/ghostRecall";
import { ghostRelease } from "../systems/ghostRelease";

const LEARN_LEVEL = 1;

export class LearnRecall {
  private clock: GhostReleaseClock = createGhostReleaseClock(LEARN_LEVEL);
  private eids: number[] = [];

  clear(): void {
    this.eids = [];
  }

  recall(
    world: World,
    owned: readonly UpgradeId[],
    pelletsEaten: number,
    frozenEid: number | null,
  ): void {
    if (this.eids.length === 0) {
      this.clock = createGhostReleaseClock(LEARN_LEVEL, pelletsEaten);
    }
    const eid = recallClosestGhostToHouse(
      world,
      this.clock,
      pelletsEaten,
      false,
      this.adds(owned, []),
      frozenEid,
    );
    if (eid !== null) {
      this.eids.push(eid);
    }
  }

  sendHome(
    world: World,
    eids: readonly number[],
    owned: readonly UpgradeId[],
    pelletsEaten: number,
  ): void {
    if (eids.length === 0) {
      return;
    }
    if (this.eids.length === 0) {
      this.clock = createGhostReleaseClock(LEARN_LEVEL, pelletsEaten);
    }
    const adds = this.adds(owned, []);
    for (const eid of eids) {
      sendGhostToHouse(world, eid, this.clock, pelletsEaten, false, adds);
      this.eids.push(eid);
    }
  }

  tick(
    world: World,
    owned: readonly UpgradeId[],
    hasInput: boolean,
    delta: number,
    pelletsEaten: number,
    heldElsewhere: readonly number[],
  ): void {
    this.eids = this.eids.filter((eid) => GhostPhase.value[eid] === GHOST_PHASE.inHouse);
    if (this.eids.length === 0) {
      return;
    }
    this.clock = tickGhostRelease(this.clock, hasInput, delta, pelletsEaten);
    const held = Array.from(query(world, [Ghost])).filter(
      (eid) => !this.eids.includes(eid) || heldElsewhere.includes(eid),
    );
    const adds = this.adds(owned, held);
    ghostHouseSeating(world, this.clock, pelletsEaten, false, adds);
    ghostRelease(world, this.clock, pelletsEaten, false, adds);
  }

  private adds(owned: readonly UpgradeId[], heldGhostEids: readonly number[]) {
    return {
      delayAddMs: ghostHouseReleaseDelayAddMs(owned),
      reliefPelletAdd: ghostHouseReliefPelletAdd(owned),
      heldGhostEids,
    };
  }
}
