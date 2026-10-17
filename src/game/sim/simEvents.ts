import type { ChainSegment } from "../../domain/bossChain";
import type { Charm } from "../../domain/charmTail";
import type { IntermissionFrame } from "../../domain/intermission";
import type { RunLogRecord } from "../../domain/runLog";
import type { GhostKindId } from "../../domain/ghostKind";
import type { TurnFeedbackKind } from "../../domain/turnTuning";
import type { StorePromptView } from "../../domain/store";
import type { FrightenedGhosts } from "../../domain/hunter";
import type { HauntedGhost, UpgradeChoiceOffer, UpgradeId } from "../../domain/upgrades";
import type { SfxId } from "../../domain/sfxId";
import type { LavaRenderState } from "../../domain/lavaZone";
import type { SpeedZone } from "../../domain/speedZones";
import type { TimedTunnelRenderState } from "../../domain/timedTunnel";
import type { DroppedWall } from "../../domain/wallDrop";
import type { ProgrammerQueueSlot } from "../../domain/programmer";
import type { WarpGlideSprite } from "../../domain/warpGlide";

export type { TimedTunnelRenderState };

export type SimRenderOptions = {
  frozenGhostEid: number | null;
  frozenGhostRemainingMs: number;
  playerInvulnRemainingMs: number;
  fruitRemainingMs?: number;
  wallPassActive: boolean;
  wallPassLoopActive?: boolean;
  turnFlashRemainingMs?: number;
  dimGhostEid?: number | null;
  playerAlpha?: number;
  entityAlpha?: number;
  wallAlpha?: number;
  mazeColorInverted?: boolean;
  playerReviveProgress?: number;
  playerWarpGlide?: WarpGlideSprite[];
  playerSpeedTrail?: WarpGlideSprite[];
  ghostWarpGlides?: Record<number, WarpGlideSprite[]>;
  hauntedGhost?: HauntedGhost | null;
  frightenedGhosts?: FrightenedGhosts | null;
  bossChains?: ChainSegment[];
  timedTunnel?: TimedTunnelRenderState | null;
  lava?: LavaRenderState | null;
  speedZones?: readonly SpeedZone[];
  droppedWall?: DroppedWall | null;
  pupilTarget?: { eids: number[]; x: number; y: number } | null;
  charms?: readonly Charm[];
  programmerQueue?: ProgrammerQueueSlot[] | null;
};

export type MoneyTalksSpend = {
  elapsedMs: number;
  count: number;
  paid: number;
  quartersBefore: number;
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
  | { type: "learnPopup"; text: string; x: number; y: number }
  | { type: "streakPop"; value: number; x: number; y: number }
  | { type: "intermission"; frame: IntermissionFrame | null }
  | { type: "banner"; text: string; boss: boolean }
  | { type: "lives"; pulse: boolean }
  | { type: "quarters"; pulse: boolean }
  | { type: "shields" }
  | { type: "shieldCrack"; index: number; progress: number }
  | {
      type: "powerPelletBreak";
      id: number;
      x: number;
      y: number;
      facingDx: number;
      facingDy: number;
      intensity: number;
      progress: number;
    }
  | { type: "walletCoins"; spend: MoneyTalksSpend | null }
  | { type: "bonus"; tier: number; filled: number }
  | { type: "fruitBonus" }
  | { type: "timeBonus"; active: boolean }
  | { type: "upgrades" }
  | { type: "timer" }
  | { type: "timerVisible"; visible: boolean }
  | { type: "startingUpgrade"; id: UpgradeId }
  | { type: "startingNotice"; title: string; body: string }
  | { type: "upgradeOffer"; offer: UpgradeChoiceOffer }
  | { type: "newLevelModal" }
  | { type: "storeOpened" }
  | { type: "storeSync"; prompt: StorePromptView | null }
  | { type: "storePurchased"; id: UpgradeId }
  | { type: "storeClosed" }
  | { type: "deathFade" }
  | { type: "endText"; title: "GAME OVER" | "RUN COMPLETE" }
  | { type: "goToMenu" }
  | { type: "newGame" }
  | { type: "runLog"; record: RunLogRecord }
  | { type: "saveRun"; collected: number; remaining: number }
  | { type: "seenGhosts"; ghostKinds: GhostKindId[] }
  | { type: "seenUpgrades"; ids: UpgradeId[] };
