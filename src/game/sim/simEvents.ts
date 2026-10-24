import type { ChainSegment } from "../../domain/bossChain";
import type { IntermissionFrame } from "../../domain/intermission";
import type { RunLogRecord } from "../../domain/runLog";
import type { GhostKindId } from "../../domain/ghostKind";
import type { TurnFeedbackKind } from "../../domain/turnTuning";
import type { StorePromptView } from "../../domain/store";
import type { FrightenedGhosts } from "../../domain/hunter";
import type {
  BaseUpgradeId,
  HauntedGhost,
  UpgradeChoiceOffer,
  UpgradeId,
} from "../../domain/upgrades";
import type { SfxId } from "../../domain/sfxId";
import type { BoreJunk } from "../../domain/boreJunk";
import type { CollapseRenderState } from "../../domain/collapseRubble";
import type { SinkholeRenderState } from "../../domain/sinkholeArt";
import type { LavaRenderState } from "../../domain/lavaZone";
import type { MazeTile } from "../../domain/maze";
import type { SpeedZone } from "../../domain/speedZones";
import type { WakeRider } from "../../domain/speedZoneWater";
import type { TimedTunnelRenderState } from "../../domain/timedTunnel";
import type { ScentSprite } from "../systems/scarecrow";
import type { ChaffSprite } from "../../domain/chaff";
import type { DroppedWall } from "../../domain/wallDrop";
import type { ProgrammerPathMark, ProgrammerQueueSlot } from "../../domain/programmer";
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
  possessedGhostEid?: number | null;
  playerAlpha?: number;
  entityAlpha?: number;
  wallAlpha?: number;
  mazeColorInverted?: boolean;
  playerReviveProgress?: number;
  playerDeathFrame?: number;
  playerWarpGlide?: WarpGlideSprite[];
  playerSpeedTrail?: WarpGlideSprite[];
  ghostWarpGlides?: Record<number, WarpGlideSprite[]>;
  spriteOffsets?: Record<number, { x: number; y: number; rotation?: number }>;
  hauntedGhost?: HauntedGhost | null;
  frightenedGhosts?: FrightenedGhosts | null;
  bossChains?: ChainSegment[];
  timedTunnel?: TimedTunnelRenderState | null;
  lava?: LavaRenderState | null;
  slimeTiles?: readonly MazeTile[];
  collapse?: CollapseRenderState | null;
  sinkhole?: SinkholeRenderState | null;
  boreJunk?: readonly BoreJunk[];
  speedZones?: readonly SpeedZone[];
  speedZoneRider?: WakeRider | null;
  droppedWall?: DroppedWall | null;
  chaff?: ChaffSprite[];
  scent?: ScentSprite[];
  pupilTarget?: { eids: number[]; x: number; y: number } | null;
  shields?: number;
  peels?: { x: number; y: number }[];
  programmerQueue?: ProgrammerQueueSlot[] | null;
  programmerPath?: ProgrammerPathMark[];
  mirror?: { x: number; y: number; facing: number } | null;
  mirrorPop?: { x: number; y: number; progress: number } | null;
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
  | { type: "chaffBurst"; x: number; y: number }
  | { type: "sonicBoomEcho"; x: number; y: number; dx: number; dy: number; tiles: number }
  | { type: "peelCrack"; x: number; y: number }
  | { type: "learnPopup"; text: string; x: number; y: number }
  | { type: "streakPop"; value: number; x: number; y: number }
  | { type: "intermission"; frame: IntermissionFrame | null }
  | { type: "banner"; text: string; boss: boolean }
  | { type: "lives"; pulse: boolean }
  | { type: "quarters"; pulse: boolean }
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
  | { type: "pennies"; tier: number; filled: number }
  | { type: "fruitBonus" }
  | { type: "timePennies"; active: boolean }
  | { type: "upgrades" }
  | { type: "salvage"; gained: UpgradeId | null; quarters: number }
  | { type: "upgradePulse"; ids: BaseUpgradeId[]; cause?: BaseUpgradeId }
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
