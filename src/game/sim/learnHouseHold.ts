import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import {
  createGhostReleaseClock,
  idleReleaseDue,
  isTimeGatedRelease,
  releaseDelayMs,
  releaseDots,
  shouldReleaseKind,
  tickGhostRelease,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import {
  ghostHouseClydePelletAdd,
  ghostHouseReleaseDelayAddMs,
  type UpgradeId,
} from "../../domain/upgrades";

const LEARN_LEVEL = 1;

export class LearnHouseHold {
  private clock: GhostReleaseClock = createGhostReleaseClock(LEARN_LEVEL);
  private heldEid: number | null = null;
  private heldKind: GhostKindId = GHOST_KIND.blinky;

  get eid(): number | null {
    return this.heldEid;
  }

  begin(eid: number, kind: GhostKindId): void {
    this.clock = createGhostReleaseClock(LEARN_LEVEL);
    this.heldEid = eid;
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
    const delayAddMs = ghostHouseReleaseDelayAddMs(owned);
    const due =
      shouldReleaseKind(this.heldKind, this.clock, pelletsEaten, false, {
        delayAddMs,
        clydePelletAdd: ghostHouseClydePelletAdd(owned),
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
    if (isTimeGatedRelease(this.heldKind, false)) {
      const delay = releaseDelayMs(this.heldKind, ghostHouseReleaseDelayAddMs(owned));
      return `HOUSE RELEASE IN ${(Math.max(0, delay - this.clock.elapsedMs) / 1000).toFixed(1)}S`;
    }
    const dots = releaseDots(this.heldKind, LEARN_LEVEL, false, ghostHouseClydePelletAdd(owned));
    return `HOUSE RELEASE IN ${Math.max(0, dots - pelletsEaten)} PELLETS`;
  }
}
