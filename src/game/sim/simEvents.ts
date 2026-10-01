import type { CorruptionId } from "../../domain/corruption";
import type { GhostKindId } from "../../domain/ghostKind";
import type { GhostTarget } from "../../domain/ghostTarget";
import type { TurnFeedbackKind } from "../../domain/turnTuning";
import type { StorePromptView } from "../../domain/store";
import type { UpgradeChoiceOffer, UpgradeId } from "../../domain/upgrades";
import type { SfxId } from "../../domain/sfxId";

export type SimRenderOptions = {
  frozenGhostEid: number | null;
  playerInvulnRemainingMs: number;
  wallPassActive: boolean;
  wallPassLoopActive?: boolean;
  turnFlashRemainingMs?: number;
  ghostHarvestActive?: boolean;
  corruptedGhostEid: number | null;
  corruptedTint: number | undefined;
  flashGhostEid: number | null;
  hiddenGhostEid: number | null;
  slimeTrailTiles: GhostTarget[];
  dimGhostEid?: number | null;
  playerAlpha?: number;
  playerReviveProgress?: number;
};

export type SimEvent =
  | { type: "sfx"; id: SfxId }
  | { type: "pelletSfx"; previousCollected: number; removed: number; powerRemoved: number }
  | { type: "loopStart"; id: SfxId }
  | { type: "loopStop"; id: SfxId }
  | { type: "musicAfterFanfare"; id: SfxId }
  | { type: "releaseDrawable"; eid: number }
  | { type: "resetBoard" }
  | { type: "draw"; options: SimRenderOptions }
  | { type: "bouncePowerPellet"; eid: number }
  | {
      type: "turnSparks";
      kind: TurnFeedbackKind;
      x: number;
      y: number;
      dx: number;
      dy: number;
      count: number;
    }
  | { type: "banner"; text: string; boss: boolean }
  | { type: "lives"; pulse: boolean }
  | { type: "quarters" }
  | { type: "bonus"; tier: number; filled: number }
  | { type: "timeBonus"; active: boolean }
  | { type: "upgrades" }
  | { type: "timer" }
  | { type: "timerVisible"; visible: boolean }
  | { type: "startingUpgrade"; id: UpgradeId }
  | { type: "upgradeOffer"; offer: UpgradeChoiceOffer }
  | { type: "newLevelModal" }
  | { type: "storeOpened" }
  | { type: "storeSync"; prompt: StorePromptView | null }
  | { type: "storePurchased"; id: UpgradeId }
  | { type: "storeClosed" }
  | { type: "deathFade" }
  | { type: "endText"; title: "GAME OVER" | "RUN COMPLETE" }
  | { type: "goToMenu" }
  | { type: "saveRun"; collected: number; remaining: number }
  | { type: "seenGhosts"; ghostKinds: GhostKindId[]; corruption: CorruptionId | null }
  | { type: "seenUpgrades"; ids: UpgradeId[] };
