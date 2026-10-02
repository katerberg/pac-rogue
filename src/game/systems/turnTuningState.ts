import type { World } from "bitecs";
import {
  TURN_FLASH_MS,
  closeSparkCount,
  isCleanTap,
  tickTurnTimer,
  turnBoostMultiplier,
  turnFeedback,
  type TurnFeedbackKind,
} from "../../domain/turnTuning";
import { turnBoostMs, turnPerfectPx, type UpgradeId } from "../../domain/upgrades";
import type { Direction } from "../components/Input";
import {
  CARDINAL_STEP,
  KEY_FOR_DIRECTION,
  freshKeys,
  isPerpendicularTurn,
  type HeldKeys,
  type TurnTap,
} from "./heldKeys";
import { playerPose } from "./playerDirection";

export type TurnSparksBurst = {
  kind: TurnFeedbackKind;
  x: number;
  y: number;
  dx: number;
  dy: number;
  count: number;
};

export class TurnTuningState {
  boostMs = 0;
  flashMs = 0;
  private perfectPending = false;
  private clockMs = 0;
  private lastPressMs: Partial<Record<keyof HeldKeys, number>> = {};

  reset(): void {
    this.boostMs = 0;
    this.flashMs = 0;
    this.perfectPending = false;
  }

  noteKeys(
    world: World,
    owned: readonly UpgradeId[],
    prevKeys: HeldKeys,
    keys: HeldKeys,
    tap: TurnTap | null,
    delta: number,
  ): TurnSparksBurst[] {
    this.clockMs += delta;
    const bursts: TurnSparksBurst[] = [];
    if (tap !== null) {
      const lastPress = this.lastPressMs[KEY_FOR_DIRECTION[tap.direction]!];
      const perfectPx = turnPerfectPx(owned);
      const feedback = turnFeedback(tap.aheadPx, isCleanTap(lastPress, this.clockMs), perfectPx);
      this.perfectPending = feedback === "perfect";
      if (feedback === "close") {
        bursts.push(...burstAtPlayer(world, "close", closeSparkCount(tap.aheadPx, perfectPx)));
      }
    }
    for (const key of freshKeys(prevKeys, keys)) {
      this.lastPressMs[key] = this.clockMs;
    }
    return bursts;
  }

  tick(delta: number): void {
    this.boostMs = tickTurnTimer(this.boostMs, delta);
    this.flashMs = tickTurnTimer(this.flashMs, delta);
  }

  speedMultiplier(owned: readonly UpgradeId[]): number {
    return turnBoostMultiplier(this.boostMs, turnBoostMs(owned));
  }

  afterMove(
    world: World,
    owned: readonly UpgradeId[],
    facingBefore: Direction,
    facingAfter: Direction,
  ): TurnSparksBurst[] {
    if (!isPerpendicularTurn(facingBefore, facingAfter)) {
      return [];
    }
    const perfect = this.perfectPending;
    this.perfectPending = false;
    if (!perfect) {
      return [];
    }
    this.boostMs = turnBoostMs(owned);
    this.flashMs = TURN_FLASH_MS;
    return burstAtPlayer(world, "perfect", 0);
  }
}

function burstAtPlayer(world: World, kind: TurnFeedbackKind, count: number): TurnSparksBurst[] {
  const pose = playerPose(world);
  if (pose === null) {
    return [];
  }
  const step = CARDINAL_STEP[pose.facing] ?? { dx: 0, dy: 0 };
  return [{ kind, x: pose.x, y: pose.y, dx: step.dx, dy: step.dy, count }];
}
