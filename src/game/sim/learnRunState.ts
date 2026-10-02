import { addBonusCharge, createBonusBar, type BonusBar } from "../../domain/bonusBar";
import {
  START_LIVES,
  levelLivesIconFloor,
  levelRegenAmount,
  livesAfterLevelRegen,
  livesRemainingAfterCatch,
} from "../../domain/lives";
import { lastLifeSaveCost } from "../../domain/moneyTalks";
import {
  deathsBountyCharge,
  grantLivesForUpgrade,
  hasUpgrade,
  lifeFloorBonus,
  moneyTalksCost,
  regenToFull,
  type UpgradeId,
} from "../../domain/upgrades";

export type LearnCatchOutcome = {
  kind: "saved" | "lost" | "reset";
  bountyCharge: number;
  quartersPaid: number;
};

export class LearnRunState {
  lives = START_LIVES;
  bonus: BonusBar = createBonusBar();
  quarters = 0;
  private deathsThisBoard = 0;

  addLives(delta: number): void {
    this.lives = Math.max(1, this.lives + delta);
  }

  addBonusCharge(points: number): void {
    const charged = addBonusCharge(this.bonus, points);
    this.bonus = charged.bar;
    this.quarters += charged.filled;
  }

  addQuarters(count: number): void {
    this.quarters += count;
  }

  levelClear(owned: readonly UpgradeId[]): number {
    this.deathsThisBoard = 0;
    const before = this.lives;
    this.lives = livesAfterLevelRegen(
      this.lives,
      levelLivesIconFloor(lifeFloorBonus(owned)),
      levelRegenAmount(hasUpgrade(owned, "passiveMyogenesis"), regenToFull(owned)),
    );
    return this.lives - before;
  }

  caught(owned: readonly UpgradeId[], defied: boolean): LearnCatchOutcome {
    const quartersPaid = defied
      ? null
      : lastLifeSaveCost(this.lives, this.quarters, moneyTalksCost(owned));
    const saved = defied || quartersPaid !== null;
    const result = saved
      ? { lives: this.lives, gameOver: false }
      : livesRemainingAfterCatch(this.lives);
    if (result.gameOver) {
      this.lives = START_LIVES + owned.reduce((sum, id) => sum + grantLivesForUpgrade(id), 0);
      this.deathsThisBoard = 0;
      return { kind: "reset", bountyCharge: 0, quartersPaid: 0 };
    }
    this.quarters -= quartersPaid ?? 0;
    this.lives = result.lives;
    const bountyCharge = deathsBountyCharge(owned, this.deathsThisBoard);
    this.deathsThisBoard += 1;
    this.addBonusCharge(bountyCharge);
    return { kind: saved ? "saved" : "lost", bountyCharge, quartersPaid: quartersPaid ?? 0 };
  }
}
