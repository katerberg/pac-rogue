import type { GhostKindId } from "../../domain/ghostKind";
import { RELEASE_SLOT, RELEASE_SLOT_BY_KIND, type ReleaseSlot } from "../../domain/ghostRoster";
import {
  createGhostReleaseClock,
  idleReleaseDue,
  isTimeGatedRelease,
  releaseDelayMs,
  releaseDots,
  shouldReleaseSlot,
  tickGhostRelease,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import { lowPowerKindReleaseAdds } from "../../domain/lowPowerUpgrades";
import {
  ghostHouseReliefPelletAdd,
  ghostHouseReleaseDelayAddMs,
  type UpgradeId,
} from "../../domain/upgrades";

const LEARN_LEVEL = 1;

export class LearnHouseHold {
  private clock: GhostReleaseClock = createGhostReleaseClock(LEARN_LEVEL);
  private heldEid: number | null = null;
  private heldSlot: ReleaseSlot = RELEASE_SLOT.anchor;
  private heldKind: GhostKindId = 0;

  get eid(): number | null {
    return this.heldEid;
  }

  begin(eid: number, kind: GhostKindId): void {
    this.clock = createGhostReleaseClock(LEARN_LEVEL);
    this.heldEid = eid;
    this.heldSlot = RELEASE_SLOT_BY_KIND[kind];
    this.heldKind = kind;
  }

  clear(): void {
    this.heldEid = null;
  }

  tick(
    owned: readonly UpgradeId[],
    hasInput: boolean,
    delta: number,
    pelletsEaten: number,
  ): number | null {
    if (this.heldEid === null) {
      return null;
    }
    this.clock = tickGhostRelease(this.clock, hasInput, delta, pelletsEaten);
    const adds = this.adds(owned);
    const due =
      shouldReleaseSlot(this.heldSlot, this.clock, pelletsEaten, false, adds) ||
      idleReleaseDue(this.clock, adds.delayAddMs);
    if (!due) {
      return null;
    }
    const released = this.heldEid;
    this.heldEid = null;
    return released;
  }

  status(owned: readonly UpgradeId[], pelletsEaten: number): string | null {
    if (this.heldEid === null) {
      return null;
    }
    if (!this.clock.started) {
      return "GHOST HELD IN HOUSE - MOVE TO START";
    }
    if (isTimeGatedRelease(this.heldSlot, false)) {
      const delay = releaseDelayMs(this.heldSlot, this.adds(owned).delayAddMs);
      return `HOUSE RELEASE IN ${(Math.max(0, delay - this.clock.elapsedMs) / 1000).toFixed(1)}S`;
    }
    const adds = this.adds(owned);
    const dots =
      releaseDots(this.heldSlot, LEARN_LEVEL, false, adds.reliefPelletAdd) + adds.pelletAdd;
    return `HOUSE RELEASE IN ${Math.max(0, dots - pelletsEaten)} PELLETS`;
  }

  private adds(owned: readonly UpgradeId[]) {
    const kind = lowPowerKindReleaseAdds(owned)(this.heldKind);
    return {
      delayAddMs: ghostHouseReleaseDelayAddMs(owned) + kind.delayMs,
      reliefPelletAdd: ghostHouseReliefPelletAdd(owned),
      pelletAdd: kind.pellets,
    };
  }
}
