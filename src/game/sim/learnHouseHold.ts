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

  get eid(): number | null {
    return this.heldEid;
  }

  begin(eid: number, kind: GhostKindId): void {
    this.clock = createGhostReleaseClock(LEARN_LEVEL);
    this.heldEid = eid;
    this.heldSlot = RELEASE_SLOT_BY_KIND[kind];
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
    const delayAddMs = ghostHouseReleaseDelayAddMs(owned);
    const due =
      shouldReleaseSlot(this.heldSlot, this.clock, pelletsEaten, false, {
        delayAddMs,
        reliefPelletAdd: ghostHouseReliefPelletAdd(owned),
      }) || idleReleaseDue(this.clock, delayAddMs);
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
      const delay = releaseDelayMs(this.heldSlot, ghostHouseReleaseDelayAddMs(owned));
      return `HOUSE RELEASE IN ${(Math.max(0, delay - this.clock.elapsedMs) / 1000).toFixed(1)}S`;
    }
    const dots = releaseDots(this.heldSlot, LEARN_LEVEL, false, ghostHouseReliefPelletAdd(owned));
    return `HOUSE RELEASE IN ${Math.max(0, dots - pelletsEaten)} PELLETS`;
  }
}
