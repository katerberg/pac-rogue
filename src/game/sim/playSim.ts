import type { RandomStream } from "../../domain/runRandom";
import {
  addComponent,
  addEntity,
  createWorld,
  hasComponent,
  query,
  removeEntity,
  type World,
} from "bitecs";
import {
  addBonusCharge,
  applyStreakPellets,
  BONUS_BAR_MAX,
  breakStreak,
  createBonusBar,
  enterCell,
  FRUIT_BONUS_CHARGE,
  tickStreakIdle,
  type BonusBar,
  type BonusResult,
  type Cell,
} from "../../domain/bonusBar";
import {
  createTimeBonusDrain,
  timeBonusPoints,
  tickTimeBonusDrain,
  type TimeBonusDrain,
} from "../../domain/timeBonus";
import {
  bossTunnelMouths,
  pickBossPelletCells,
  type BossTunnelMouth,
} from "../../domain/bossBoard";
import {
  advanceBossStage,
  bossGhostKind,
  bossStage,
  bossStartGhosts,
  chainPairForKind,
  createBossState,
  isBossLevel,
  isFinalBossStage,
  pickBoss,
  recordBossPelletsEaten,
  splitBossGhosts,
  type BossDef,
  type BossState,
} from "../../domain/bossRules";
import {
  createBossStageTransition,
  tickBossStageTransition,
  type BossStageTransition,
} from "../../domain/bossStageTransition";
import {
  beginDeathSequence,
  tickDeathSequence,
  type DeathSequenceEvent,
  type DeathSequenceState,
} from "../../domain/deathSequence";
import { reviveSplashProgress } from "../../domain/reviveSplash";
import { respawnCenter } from "../../domain/martyr";
import { lastLifeSaveCost, moneyTalksLaunchedCount } from "../../domain/moneyTalks";
import { interestCoinsShown, type InterestPop } from "../../domain/interest";
import {
  createFruitPresence,
  fruitSpecForLevel,
  extendFruitLifetime,
  fruitStackCenter,
  markFruitCollected,
  tickFruitPresence,
  type FruitPresence,
} from "../../domain/fruit";
import { ghostHouseSeatCenters } from "../../domain/ghostHouseSeats";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import {
  DEFAULT_GHOST_STYLE,
  lineArtDrawableIds,
  lineArtGhostKinds,
  lineArtPlayer,
  lineArtQuarter,
  type GhostStyle,
} from "../../domain/ghostArt";
import {
  createGhostModeClock,
  GHOST_AI_MODE,
  resolveGhostModeStep,
  startGhostModeClock,
  type GhostAiMode,
  type GhostModeClock,
} from "../../domain/ghostMode";
import {
  BLINKY_RELEASE_DELAY_MS,
  createGhostReleaseClock,
  resetIdle,
  tickGhostRelease,
  type GhostReleaseAdds,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import {
  blinkyScatterTarget,
  clydeScatterTarget,
  GHOST_PHASE,
  inkyScatterTarget,
  pinkyScatterTarget,
} from "../../domain/ghostTarget";
import {
  enhancedOfferChance,
  ghostKindsForLevel,
  isInvertedMazeLevel,
  isTimedTunnelLevel,
  MAX_LEVEL,
  offersUpgradeAfterLevel,
  speedLevelMultiplier,
} from "../../domain/levelRules";
import {
  DEFAULT_MAX_LIVES,
  START_LIVES,
  STORE_REGEN_AMOUNT,
  levelLivesIconFloor,
  levelRegenAmount,
  livesAfterLevelRegen,
  livesRemainingAfterCatch,
  storeLifeRoom,
} from "../../domain/lives";
import {
  activateAsciiLayout,
  activateLayout,
  cellCenterX,
  cellCenterY,
  clampToGridCenters,
  getActiveLayout,
  horizontalTunnelRows,
  worldToCol,
  worldToRow,
  type MazeLayoutId,
} from "../../domain/maze";
import {
  pickTimedTunnelRow,
  timedTunnelGateVisible,
  timedTunnelPhase,
  timedTunnelPhaseRemainingMs,
  type TimedTunnelPhase,
} from "../../domain/timedTunnel";
import {
  GENERATE_MAX_ATTEMPTS,
  generateMazeAsciiWithRetries,
  invertMazeAscii,
  resolveBoardSelection,
} from "../../domain/mazeGenerate";
import { STORE_MAZE_ASCII } from "../../domain/mazeLayouts";
import {
  addPelletsToProgress,
  applyPelletCollect,
  createPelletProgress,
  type PelletProgress,
} from "../../domain/pelletProgress";
import type { PlayOptions } from "../../domain/playOptions";
import {
  BOSS_PELLET_DRAWABLE_ID,
  GHOST_DRAWABLE_BY_KIND,
  ghostRadius,
  PELLET_DRAWABLE_ID,
  playerPreTurnPx,
  playerSpeed,
} from "../../domain/playfield";
import { createRunClock, tickRunClock, type RunClock } from "../../domain/runClock";
import { TEST_RUN_LOG_META, type QuarterSource, type RunLogMeta } from "../../domain/runLog";
import { playerExitedTunnel } from "../../domain/tunnelExit";
import { elroyTier } from "../../domain/ghostSpeed";
import { DEFAULT_TUNING, type Tuning } from "../../domain/tuning";
import { storeExitCellAt, storeRouteStep } from "../../domain/storeRoute";
import { createRunRandom, type RunRandom } from "../../domain/runRandom";
import {
  storeLevelFor,
  STORE_FIRST_LEVEL,
  STORE_EXIT_SLIDE_TILES,
  createStoreState,
  parseStoreSlots,
  pickMidStoreLevel,
  promptView,
  slotIndexAtCell,
  storeAfterLevel,
  storeExitAlpha,
  storeExitDirection,
  storeSlotLabel,
  storeStep,
  type StoreExitDirection,
  type StorePurchase,
  type StoreState,
} from "../../domain/store";
import {
  cellSpeedMultiplier,
  TUNNEL_DASH_SPEED_MUL,
  applyPowerPelletEffects,
  applyShieldBreakInvuln,
  applyStreakEngineInvuln,
  bankShields,
  grantStartingShields,
  clearUpgradeTimers,
  queueEcho,
  powerPelletPickupFires,
  shieldBreakOwned,
  shieldOverflow,
  shieldPelletsCap,
  spendShield,
  deathsBountyCharge,
  defyDeathActive,
  confirmUpgradeChoice,
  createRunUpgrades,
  declineUpgrades,
  FRUIT_FECUNDITY_MUL,
  fruitLifetimeMultiplier,
  fruitQuartersPerFruit,
  martyrGhostPlacement,
  hauntDurationMs,
  armHaunt,
  tickHaunt,
  hauntedGhost,
  hauntedGhostEid,
  eatFrightenedGhost,
  frightenedGhostEids,
  frightenedGhosts,
  hunterHoldsEaten,
  tickFrightened,
  nearMissCharge,
  streakEngineEvery,
  moneyTalksCost,
  interestPayout,
  deathsHarvestRadiusTiles,
  speedBurstMultiplier,
  hyperspeedActive,
  hyperspeedMultiplier,
  spendHyperspeedShield,
  startHyperspeedTurnDelay,
  tickHyperspeed,
  secondChompMs,
  lifeFloorBonus,
  hasUpgrade,
  effectiveOwned,
  enhanceGrantLives,
  enhanceUpgrade,
  enhancedIdOf,
  wallPassLoopOwned,
  fruitFeastThresholds,
  fruitPowerConvertsPellet,
  fruitPersistsUntilLevelEnd,
  fruitStacksSideBySide,
  ghostTunnelSpeedRatio,
  ghostsBlockedFromTunnels,
  applyTunnelExitInvuln,
  baseIdOf,
  pelletSurgeCount,
  specialistEnhancedBases,
  lazyLooperRings,
  regenToFull,
  frozenGhostEid,
  ghostHouseClydePelletAdd,
  ghostHouseReleaseDelayAddMs,
  ghostSpeedMultiplier,
  grantLivesForUpgrade,
  grantUpgrade,
  pelletCollectRadiusBonusPx,
  pickStartingUpgrade,
  pickUpgradeChoiceOffer,
  playerIsInvulnerable,
  playerTintRemainingMs,
  playerSpeedMultiplier,
  queuePowerPelletRespawns,
  revokeUpgrade,
  speedBurstActive,
  ghostHarvestActive,
  tickDefyDeath,
  tickGhostHarvest,
  tickFreeze,
  tickInvuln,
  tickPowerPelletRespawns,
  tickSpeedBurst,
  tickWallPass,
  wallPassActive,
  type PendingPowerPelletRespawn,
  type RunUpgrades,
  type UpgradeChoiceOffer,
  type UpgradeChoiceOption,
  type BaseUpgradeId,
  type UpgradeId,
  remoteTransferEvery,
} from "../../domain/upgrades";
import { remoteTransferTriggers } from "../../domain/pelletCollectExtra";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
import { ChainedGhost } from "../components/ChainedGhost";
import { tagOptionalPellets } from "../systems/lazyLooper";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { bossChains, chainCatch } from "../systems/bossChain";
import { bossGhostBlock, countBossPellets, pickFreeBossMouth } from "../systems/bossGhosts";
import { catchPlayer, edibleGhostsTouchingPlayer, type CatchOptions } from "../systems/catchPlayer";
import { stepNearMisses } from "../systems/nearMiss";
import { streakEngineFires, streakPops } from "../../domain/streakEngine";
import { pelletAbsorbActive, pelletAbsorbSpawnFor } from "../../domain/pelletAbsorb";
import type { RemovedPelletSnap } from "../systems/collectPellets";
import { tickEchoes } from "../../domain/echo";
import { createNearMissPasses, type NearMissPasses } from "../../domain/nearMiss";
import { collectExtraPellets } from "../systems/collectExtraPellets";
import { applyRemoteTransference } from "../systems/remoteTransference";
import { wallPassSolids } from "../systems/wallPassSolids";
import { collectFruit, fruitPositions, removeAllFruit } from "../systems/collectFruit";
import {
  collectPellets,
  countPellets,
  noRequiredPelletsLeft,
  type PlayerPelletFrame,
} from "../systems/collectPellets";
import {
  emptyPlayerPelletFrame,
  hyperspeedSubstepCount,
  mergePlayerPelletFrames,
  noteHyperspeedFacing,
} from "../systems/hyperspeed";
import type { Direction } from "../components/Input";
import { harvestNearbyPellets } from "../systems/deathsHarvest";
import { shieldCrackProgress } from "../../domain/shieldCrack";
import { ghostAi } from "../systems/ghostAi";
import { ghostExitHouse } from "../systems/ghostExitHouse";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { harvestPelletsByGhosts } from "../systems/ghostHarvest";
import {
  ghostHouseSeating,
  placeInHouseGhostsAtPredictedSeats,
} from "../systems/ghostHouseSeating";
import { recallClosestGhostToHouse, sendGhostToHouse } from "../systems/ghostRecall";
import { ghostRelease } from "../systems/ghostRelease";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import {
  NO_KEYS_HELD,
  anyKeyHeld,
  applyHeldKeys,
  type HeldKeys,
  type TurnTap,
} from "../systems/heldKeys";
import { TurnTuningState, type TurnSparksBurst } from "../systems/turnTuningState";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { enteringEmptyCell } from "../systems/enteringEmptyCell";
import { pelletAtCell } from "../systems/pelletAtCell";
import { playerCell } from "../systems/playerCell";
import {
  clearPlayerDirectionInput,
  hasPlayerDirectionInput,
  playerFacing,
  steerPlayer,
} from "../systems/playerDirection";
import { slidePlayer } from "../systems/playerSlide";
import { eatDragAfterCollect, eatDragMultiplier, tickEatDrag } from "../../domain/eatDrag";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import {
  startWarpGlide,
  tickWarpGlide,
  type Point,
  type WarpGlide,
  warpGlideRemainingMs,
  warpGlideSprites,
} from "../../domain/warpGlide";
import { speedTrailSprites, tickSpeedTrail, type SpeedTrail } from "../../domain/speedTrail";
import { warpPlayerFarthestFromGhosts } from "../systems/playerWarp";
import {
  ghostWarpGlideRemainingMs,
  ghostWarpGlideSprites,
  glidingGhostEids,
  heldGhostEids,
  mergeGhostCornerWarps,
  tickGhostCornerWarps,
  type GhostCornerWarp,
} from "../../domain/ghostCornerWarp";
import { teleportGhostsToCorners } from "../systems/ghostCornerTeleport";
import { frightenedGhostAi, frightenGhosts } from "../systems/ghostFrightened";
import { hunterFrightenLimit } from "../../domain/hunter";
import {
  applyTunnelDash,
  tickTunnelDashAnimation,
  type TunnelDashAnimation,
} from "../systems/tunnelDash";
import { nameOf, worldSnapshot } from "../systems/worldSnapshot";
import type { MoneyTalksSpend, SimEvent, SimRenderOptions } from "./simEvents";
import { spawnBoardPellets, spawnFruit, spawnPellet, spawnPlayer, spawnWalls } from "./spawn";
import type { SimInput } from "./simInput";
import { ghostName, RunRecorder } from "./runRecorder";

export const LEVEL_TRANSITION_MS = 1000;
export const RUN_END_MENU_ARM_MS = 1000;

export type RunEndChoice = "newGame" | "menu";

export type PlayHud = {
  time: number;
  timerVisible: boolean;
  lives: number;
  quarters: number;
  bonusCharge: number;
  upgrades: readonly UpgradeId[];
  collected: number;
  shields: number;
};

export class PlaySim {
  world: World = createWorld();
  readonly random: RunRandom;
  private events: SimEvent[] = [];
  private readonly options: PlayOptions;
  private suppressInputUntilKeyRelease = false;
  private awaitingStartingCard = false;
  private awaitingChoice = false;
  private pendingChoice: UpgradeChoiceOffer | null = null;
  private clock: RunClock = createRunClock();
  private ghostReleaseClock: GhostReleaseClock = createGhostReleaseClock();
  private ghostModeClock: GhostModeClock = createGhostModeClock(1);
  private previousEffectiveGhostMode: GhostAiMode = createGhostModeClock(1).mode;
  private pelletProgress: PelletProgress = createPelletProgress(0);
  private lifetimeCollected = 0;
  private remoteTransferCounter = 0;
  private deathsThisBoard = 0;
  private nearMissPasses: NearMissPasses = createNearMissPasses();
  private nearMissesPaid = 0;
  private streakPopCount = 0;
  private lastStreakPop: number | null = null;
  private quarters = 0;
  private bonus: BonusBar;
  private lastPlayerCell: Cell | null = null;
  private timeBonusDrain: TimeBonusDrain | null = null;
  private levelIndex = 1;
  private secondGhostKind: GhostKindId = GHOST_KIND.pinky;
  private bossState: BossState | null = null;
  private bossMouths: BossTunnelMouth[] = [];
  private bossStageTransition: BossStageTransition | null = null;
  private bossStageDraw: { entityAlpha: number; wallAlpha: number } | null = null;
  private levelTransitionRemainingMs = 0;
  private pendingLevelClear = false;
  private runCompleteElapsedMs: number | null = null;
  private fruitPresence: FruitPresence = createFruitPresence();
  private pendingPowerPelletRespawns: PendingPowerPelletRespawn[] = [];
  private tunnelDashAnim: TunnelDashAnimation | null = null;
  private timedTunnelGatedRow: number | null = null;
  private timedTunnelElapsedMs = 0;
  private warpGlide: WarpGlide | null = null;
  private speedTrail: SpeedTrail = [];
  private hyperspeedDirection: Direction | null = null;
  private hyperspeedPellets: PlayerPelletFrame = emptyPlayerPelletFrame();
  private hyperspeedFruitEaten = 0;
  private ghostCornerWarps: GhostCornerWarp[] = [];
  private runUpgrades: RunUpgrades = createRunUpgrades();
  private effectiveCache: { owned: readonly UpgradeId[]; effective: readonly UpgradeId[] } | null =
    null;
  private enhanceLivesPaid = new Set<BaseUpgradeId>();
  private midStoreLevel = 5;
  private store: StoreState | null = null;
  private storeExitSlide: (StoreExitDirection & { traveledPx: number }) | null = null;
  private storeRoute: Cell | null = null;
  private timerVisible = true;
  private death: DeathSequenceState | null = null;
  private fellAt: Point | null = null;
  private caughtByEid: number | null = null;
  private reviveSplashPending = false;
  private reviveSplashElapsedMs: number | null = null;
  private shieldCrack: { index: number; elapsedMs: number } | null = null;
  private moneyTalksSpend: MoneyTalksSpend | null = null;
  private interestPop: InterestPop | null = null;
  private lives: number;
  private afterLifeRelease = false;
  private eatDragMs = 0;
  private readonly turnTuning = new TurnTuningState();
  private prevKeys: HeldKeys = NO_KEYS_HELD;

  private currentTuning: Tuning;
  private ghostStyle: GhostStyle = DEFAULT_GHOST_STYLE;
  private readonly recorder: RunRecorder;

  constructor(
    options: PlayOptions,
    seed: string,
    tuning: Tuning = DEFAULT_TUNING,
    runLogMeta: RunLogMeta = TEST_RUN_LOG_META,
  ) {
    this.options = options;
    this.currentTuning = tuning;
    this.random = createRunRandom(seed);
    this.recorder = new RunRecorder(runLogMeta, seed, options.highScoresDisabled);
    this.quarters = options.quarters ?? 0;
    this.bonus = createBonusBar(options.bonus ?? 0);
    this.lives = options.lives ?? START_LIVES;
  }

  get tuning(): Tuning {
    return this.currentTuning;
  }

  setTuning(tuning: Tuning): void {
    this.currentTuning = tuning;
  }

  setGhostStyle(style: GhostStyle): void {
    this.ghostStyle = style;
  }

  start(): SimEvent[] {
    this.events = [];
    const options = this.options;
    this.midStoreLevel = pickMidStoreLevel(this.random.stream("midStore"));
    this.levelIndex =
      options.level ??
      (options.jumpToUpgrade
        ? 2
        : options.store !== null
          ? storeLevelFor(options.store, this.midStoreLevel)
          : 1);
    this.secondGhostKind =
      this.random.stream("secondGhost")() < 0.5 ? GHOST_KIND.pinky : GHOST_KIND.inky;
    this.runUpgrades = createRunUpgrades(options.enableUpgrades);
    for (const id of this.runUpgrades.owned) {
      this.lives += grantLivesForUpgrade(id);
      this.recorder.gained(id, "flag", this.levelIndex);
    }
    this.grantSpecialistLives();
    this.recordSeenUpgrades();

    this.startBoard(options.maze);

    const startingUpgrade =
      this.levelIndex === 1 &&
      !options.jumpToUpgrade &&
      options.store === null &&
      !options.disableLevelUpgrades
        ? pickStartingUpgrade(this.runUpgrades.owned, this.random.stream("startingUpgrade"))
        : null;
    if (startingUpgrade !== null) {
      this.recorder.gained(startingUpgrade, "start", this.levelIndex);
      this.runUpgrades = grantUpgrade(this.runUpgrades, startingUpgrade);
      this.applyGrantEffects(startingUpgrade);
      this.grantSpecialistLives();
      this.recordSeenUpgrades();
    }
    this.emit({ type: "upgrades" });
    this.recorder.livesStart(this.lives);
    this.emit({ type: "lives", pulse: false });
    this.emitRunLog();
    if (startingUpgrade === null) {
      this.showLevelBanner();
    } else {
      this.emitDraw({ frozenGhostEid: null, playerInvulnRemainingMs: 0, wallPassActive: false });
      this.awaitingStartingCard = true;
      this.emit({ type: "startingUpgrade", id: startingUpgrade });
    }
    this.emit({ type: "loopStart", id: "gameplayMusic" });
    if (options.jumpToUpgrade) {
      this.jumpToLevelClear();
    } else if (options.bossStageAdvance && this.bossState !== null) {
      this.beginBossStageTransition();
    } else if (options.store !== null) {
      this.enterStore();
    }
    return this.takeEvents();
  }

  step(input: SimInput, delta: number): SimEvent[] {
    this.events = [];
    this.recorder.advance(delta);
    this.tick(input, delta);
    this.prevKeys = input.keys;
    return this.takeEvents();
  }

  runEndMenuArmed(): boolean {
    return this.runCompleteElapsedMs !== null && this.runCompleteElapsedMs >= RUN_END_MENU_ARM_MS;
  }

  chooseRunEnd(choice: RunEndChoice): SimEvent[] {
    if (!this.runEndMenuArmed()) {
      return [];
    }
    this.emit({ type: choice === "newGame" ? "newGame" : "goToMenu" });
    return this.takeEvents();
  }

  chooseUpgrade(chosen: UpgradeChoiceOption): SimEvent[] {
    this.events = [];
    const offer = this.pendingChoice;
    if (offer === null) {
      return [];
    }
    this.pendingChoice = null;
    if (chosen.kind === "quarters") {
      this.quarters += chosen.amount;
      this.recorder.quarters("offer", chosen.amount);
      this.recorder.picked("quarters");
      this.emit({ type: "quarters", pulse: false });
      this.runUpgrades = declineUpgrades(this.runUpgrades, offer.upgrades);
    } else {
      const alreadyOwned = hasUpgrade(this.runUpgrades.owned, chosen.id);
      const grantedId = chosen.enhanced === true ? enhancedIdOf(chosen.id) : chosen.id;
      this.recorder.picked(chosen.id);
      this.runUpgrades = confirmUpgradeChoice(
        this.runUpgrades,
        offer.upgrades,
        chosen.id,
        grantedId,
      );
      if (!alreadyOwned) {
        this.recorder.gained(grantedId, "offer", this.levelIndex);
        if (chosen.enhanced === true) {
          this.enhanceLivesPaid.add(chosen.id);
        }
        this.applyGrantEffects(grantedId);
        this.grantSpecialistLives();
        this.emit({ type: "lives", pulse: false });
        this.recordSeenUpgrades();
      }
    }
    this.emit({ type: "upgrades" });
    return this.takeEvents();
  }

  finishRun(outcome: "quit"): SimEvent[] {
    if (!this.recorder.finish(outcome)) {
      return [];
    }
    this.emitRunLog();
    return this.takeEvents();
  }

  notePause(ms: number): void {
    this.recorder.paused(ms);
  }

  noteHidden(ms: number): void {
    this.recorder.hidden(ms);
  }

  runLogRecord() {
    return this.recorder.snapshotRecord(this.runTotals());
  }

  suppressInputUntilRelease(): void {
    this.suppressInputUntilKeyRelease = true;
  }

  storeRouting(): boolean {
    return this.storeRoute !== null;
  }

  storeExitUnder(x: number, y: number): boolean {
    return (
      this.readsStoreKeys() &&
      !this.storeConfirmOpen() &&
      storeExitCellAt(getActiveLayout().playerSolids, worldToCol(x), worldToRow(y)) !== null
    );
  }

  readsStoreKeys(): boolean {
    return this.store !== null && this.storeExitSlide === null;
  }

  storeState(): StoreState | null {
    return this.store;
  }

  offer(): UpgradeChoiceOffer | null {
    return this.pendingChoice;
  }

  currentLevel(): number {
    return this.levelIndex;
  }

  hud(): PlayHud {
    return {
      time: this.clock.remaining,
      timerVisible: this.timerVisible,
      lives: this.lives,
      quarters:
        this.quarters -
        (this.interestPop === null
          ? 0
          : this.interestPop.count - interestCoinsShown(this.interestPop)),
      bonusCharge: this.bonus.charge,
      upgrades: this.effectiveUpgrades(),
      collected: this.lifetimeCollected,
      shields: this.runUpgrades.shieldsBanked,
    };
  }

  renderOptions(): SimRenderOptions {
    return {
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      frozenGhostRemainingMs: this.runUpgrades.freezeRemainingMs,
      playerInvulnRemainingMs: playerTintRemainingMs(this.runUpgrades),
      fruitRemainingMs: this.fruitPresence.remainingMs,
      wallPassActive: wallPassActive(this.runUpgrades),
      wallPassLoopActive:
        wallPassActive(this.runUpgrades) && wallPassLoopOwned(this.effectiveUpgrades()),
      turnFlashRemainingMs: this.turnTuning.flashMs,
      playerWarpGlide: this.warpGlide === null ? undefined : warpGlideSprites(this.warpGlide),
      playerSpeedTrail:
        this.death === null &&
        (speedBurstActive(this.runUpgrades) || hyperspeedActive(this.runUpgrades))
          ? speedTrailSprites(this.speedTrail, getActiveLayout().tileSize)
          : undefined,
      ghostWarpGlides: ghostWarpGlideSprites(this.ghostCornerWarps),
      hauntedGhost: hauntedGhost(this.runUpgrades),
      frightenedGhosts: frightenedGhosts(this.runUpgrades),
      bossChains: bossChains(this.world, this.catchOptions()),
      lineArtDrawableIds: lineArtDrawableIds(this.ghostStyle, this.presentGhostKinds()),
      entityAlpha: this.bossStageDraw?.entityAlpha,
      wallAlpha: this.bossStageDraw?.wallAlpha,
      mazeColorInverted: this.bossState?.mazeColorInverted === true,
      timedTunnel: this.timedTunnelRenderState(),
    };
  }

  private presentGhostKinds(): GhostKindId[] {
    return Array.from(
      query(this.world, [Ghost, GhostKind]),
      (eid) => GhostKind.kind[eid] as GhostKindId,
    );
  }

  snapshot() {
    const upgrades = this.runUpgrades;
    return {
      seed: this.random.seed,
      knobs: this.options.knobs,
      tuning: this.currentTuning,
      level: this.levelIndex,
      layout: getActiveLayout().id,
      lives: this.lives,
      quarters: this.quarters,
      timeRemaining: this.clock.remaining,
      bonus: {
        charge: this.bonus.charge,
        streak: this.bonus.streak,
        max: BONUS_BAR_MAX,
        draining: this.timeBonusDrain !== null,
      },
      deathsThisBoard: this.deathsThisBoard,
      hauntedGhost: ghostName(this.world, hauntedGhostEid(upgrades)),
      nearMissesPaid: this.nearMissesPaid,
      frightenedGhosts: [...frightenedGhostEids(upgrades)].map((eid) => ghostName(this.world, eid)),
      hunterHeld: upgrades.hunterHeldEids.map((eid) => ghostName(this.world, eid)),
      ghostsEatenThisFright: upgrades.ghostsEatenThisFright,
      streakPops: { count: this.streakPopCount, last: this.lastStreakPop },
      boardCollected: this.pelletProgress.boardCollected,
      pelletsRemaining: this.pelletProgress.pelletsRemaining,
      ghostMode: nameOf(GHOST_AI_MODE, this.ghostModeClock.mode),
      upgrades: upgrades.owned,
      effectiveUpgrades: this.effectiveUpgrades(),
      timers: {
        freezeMs: upgrades.freezeRemainingMs,
        wallPassMs: upgrades.wallPassRemainingMs,
        invulnMs: upgrades.invulnRemainingMs,
        speedBurstMs: upgrades.speedBurstRemainingMs,
        hyperspeedMs: upgrades.hyperspeedRemainingMs,
        hyperspeedTurnDelayMs: upgrades.hyperspeedTurnDelayMs,
        hyperspeedShieldMs: upgrades.hyperspeedShieldRemainingMs,
        ghostHarvestMs: upgrades.ghostHarvestRemainingMs,
        defyDeathMs: upgrades.defyDeathRemainingMs,
        hauntMs: Number.isFinite(upgrades.hauntRemainingMs) ? upgrades.hauntRemainingMs : -1,
        shieldsBanked: upgrades.shieldsBanked,
        echoesMs: upgrades.pendingEchoes.map((echo) => echo.remainingMs),
        frightenedMs: upgrades.frightenedRemainingMs,
        eatDragMs: this.eatDragMs,
        fruitMs: this.fruitPresence.remainingMs,
        turnBoostMs: this.turnTuning.boostMs,
        turnFlashMs: this.turnTuning.flashMs,
        warpGlideMs: warpGlideRemainingMs(this.warpGlide),
        ghostWarpGlideMs: ghostWarpGlideRemainingMs(this.ghostCornerWarps),
      },
      timedTunnel: this.timedTunnelSnapshot(),
      inputSuppressed: this.suppressInputUntilKeyRelease,
      dying: this.death !== null,
      reviveProgress:
        this.reviveSplashElapsedMs === null
          ? null
          : reviveSplashProgress(this.reviveSplashElapsedMs),
      moneyTalksElapsedMs: this.moneyTalksSpend?.elapsedMs ?? null,
      interestPop:
        this.interestPop === null
          ? null
          : { count: this.interestPop.count, shown: interestCoinsShown(this.interestPop) },
      shieldCrackProgress:
        this.shieldCrack === null ? null : shieldCrackProgress(this.shieldCrack.elapsedMs),
      levelTransition: this.levelTransitionRemainingMs > 0,
      bossStageTransition: this.bossStageTransition !== null,
      runComplete: this.runCompleteElapsedMs !== null,
      runEndMenuArmed: this.runEndMenuArmed(),
      highScoresDisabled: this.options.highScoresDisabled,
      inStore: this.store !== null,
      storeStock: this.store?.slots.filter((slot) => !slot.sold).map(storeSlotLabel) ?? null,
      storeRoute: this.storeRoute,
      storePrompt:
        this.store === null
          ? null
          : (promptView(this.store, this.quarters, this.runUpgrades.owned)?.kind ?? null),
      boss:
        this.bossState === null
          ? null
          : {
              id: this.bossState.def.id,
              ghostCount: this.bossState.ghostCount,
              chainLive: bossChains(this.world, this.catchOptions()).length > 0,
              stage: this.bossState.stageIndex + 1,
              chainPairs: [...bossStage(this.bossState.def, this.bossState.stageIndex).chainPairs],
              mazeColorInverted: this.bossState.mazeColorInverted,
            },
      lineArtGhosts: lineArtGhostKinds(this.ghostStyle, this.presentGhostKinds()).map((kind) =>
        nameOf(GHOST_KIND, kind),
      ),
      lineArtPlayer: lineArtPlayer(this.ghostStyle),
      lineArtQuarter: lineArtQuarter(this.ghostStyle),
      runLog: {
        id: this.recorder.record.id,
        outcome: this.recorder.outcome,
        levels: this.recorder.record.levels.length,
        deaths: this.recorder.record.levels.reduce((sum, level) => sum + level.deaths.length, 0),
        tunnelWraps: this.recorder.record.levels.reduce((sum, level) => sum + level.tunnelWraps, 0),
      },
      ...worldSnapshot(this.world),
    };
  }

  private emitTurnSparks(bursts: readonly TurnSparksBurst[]): void {
    for (const burst of bursts) {
      this.recorder.turnSpark(burst.kind);
      this.emit({ type: "turnSparks", ...burst });
    }
  }

  private emit(event: SimEvent): void {
    this.events.push(event);
  }

  private takeEvents(): SimEvent[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  private teleportGhostsToCorners(holdMs: number): void {
    const warps = teleportGhostsToCorners(this.world, holdMs);
    this.recorder.scatterBurst(warps.length);
    this.ghostCornerWarps = mergeGhostCornerWarps(this.ghostCornerWarps, warps);
  }

  private emitDraw(overrides: Partial<SimRenderOptions> = {}): void {
    this.emit({ type: "draw", options: { ...this.renderOptions(), ...overrides } });
  }

  private releaseDrawable(eid: number): void {
    this.emit({ type: "releaseDrawable", eid });
  }

  private emitPelletAbsorb(snap: RemovedPelletSnap): void {
    if (!pelletAbsorbActive(this.currentTuning)) {
      return;
    }
    const spawn = pelletAbsorbSpawnFor(
      this.ghostStyle,
      snap.drawableId,
      snap.optional,
      snap.x,
      snap.y,
    );
    if (spawn !== null) {
      this.emit({ type: "pelletAbsorb", ...spawn });
    }
  }

  private releasePelletSnap(snap: RemovedPelletSnap): void {
    this.emitPelletAbsorb(snap);
    this.releaseDrawable(snap.eid);
  }

  private tick(input: SimInput, delta: number): void {
    if (this.warpGlide !== null) {
      this.warpGlide = tickWarpGlide(this.warpGlide, delta);
    }
    this.ghostCornerWarps = tickGhostCornerWarps(this.ghostCornerWarps, delta);
    this.tickShieldCrack(delta);
    if (this.awaitingStartingCard) {
      if (input.uiOpen) {
        return;
      }
      this.awaitingStartingCard = false;
      this.suppressInputUntilKeyRelease = true;
    }

    if (this.death !== null) {
      const tick = tickDeathSequence(this.death, delta, this.currentTuning);
      this.death = tick.state;
      for (const event of tick.events) {
        this.handleDeathEvent(event);
      }
      this.tickReviveSplash(delta);
      this.tickMoneyTalks(delta);
      return;
    }

    if (this.runCompleteElapsedMs !== null) {
      this.runCompleteElapsedMs += delta;
      return;
    }

    if (this.bossStageTransition !== null) {
      this.tickBossStageTransitionFrame(delta);
      return;
    }

    if (this.levelTransitionRemainingMs > 0) {
      this.levelTransitionRemainingMs = Math.max(0, this.levelTransitionRemainingMs - delta);
      if (this.levelTransitionRemainingMs === 0) {
        if (this.store === null && storeAfterLevel(this.levelIndex, this.midStoreLevel)) {
          this.enterStore();
        } else if (this.levelIndex >= MAX_LEVEL) {
          this.beginRunComplete();
        } else {
          this.advanceToNextLevel();
        }
      }
      return;
    }

    if (this.store !== null) {
      this.tickStore(input, delta);
      return;
    }

    if (this.timeBonusDrain !== null) {
      this.tickTimeBonus(this.timeBonusDrain, delta);
      return;
    }

    if (this.awaitingChoice) {
      if (this.pendingChoice !== null || input.uiOpen) {
        return;
      }
      this.awaitingChoice = false;
      this.suppressInputUntilKeyRelease = true;
    }

    if (this.pendingLevelClear) {
      this.pendingLevelClear = false;
      this.beginLevelTransition();
      return;
    }

    this.recorder.playFrame(delta, {
      freeze: frozenGhostEid(this.runUpgrades) !== null,
      invuln: playerIsInvulnerable(this.runUpgrades),
      wallPass: wallPassActive(this.runUpgrades),
      speedBurst: speedBurstActive(this.runUpgrades),
      ghostHarvest: ghostHarvestActive(this.runUpgrades),
    });
    this.tickTimedTunnel(delta);
    this.recorder.lives(this.lives);
    const diagonalAllowed = wallPassActive(this.runUpgrades);
    const turnTuningOpts =
      !diagonalAllowed && hasUpgrade(this.effectiveUpgrades(), "passiveTurnTuning")
        ? { prevKeys: this.prevKeys, solids: getActiveLayout().playerSolids }
        : undefined;
    let turnTap: TurnTap | null = null;
    const warping = this.warpGlide !== null;
    if (this.suppressInputUntilKeyRelease) {
      if (!warping && !anyKeyHeld(input.keys)) {
        this.suppressInputUntilKeyRelease = false;
        applyHeldKeys(this.world, input.keys, { diagonalAllowed });
      }
    } else if (!warping) {
      turnTap = applyHeldKeys(this.world, input.keys, {
        diagonalAllowed,
        turnTuning: turnTuningOpts,
      });
    }
    if (turnTuningOpts) {
      this.emitTurnSparks(
        this.turnTuning.noteKeys(
          this.world,
          this.effectiveUpgrades(),
          this.prevKeys,
          input.keys,
          turnTap,
          delta,
        ),
      );
    }
    const hasInput = hasPlayerDirectionInput(this.world);

    this.ghostReleaseClock = tickGhostRelease(
      this.ghostReleaseClock,
      hasInput,
      delta,
      this.pelletProgress.boardCollected,
    );
    const releaseAdds = this.releaseAdds();
    ghostHouseSeating(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
      releaseAdds,
    );
    if (
      ghostRelease(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        releaseAdds,
      )
    ) {
      this.ghostReleaseClock = resetIdle(this.ghostReleaseClock);
    }

    this.runUpgrades = tickFreeze(this.runUpgrades, delta);
    const wasWallPass = wallPassActive(this.runUpgrades);
    this.runUpgrades = tickWallPass(this.runUpgrades, delta);
    if (wasWallPass && !wallPassActive(this.runUpgrades)) {
      snapPlayerToNearestWalkable(this.world);
    }
    this.runUpgrades = tickInvuln(this.runUpgrades, delta);
    this.runUpgrades = tickSpeedBurst(this.runUpgrades, delta);
    this.runUpgrades = tickHyperspeed(this.runUpgrades, delta);
    if (!hyperspeedActive(this.runUpgrades)) {
      this.hyperspeedDirection = null;
    }
    this.runUpgrades = tickGhostHarvest(this.runUpgrades, delta);
    this.runUpgrades = tickDefyDeath(this.runUpgrades, delta);
    this.runUpgrades = tickHaunt(this.runUpgrades, delta);
    this.runUpgrades = tickFrightened(this.runUpgrades, delta);
    const respawnTick = tickPowerPelletRespawns(this.pendingPowerPelletRespawns, delta);
    this.pendingPowerPelletRespawns = respawnTick.pending;
    for (const pos of respawnTick.ready) {
      this.spawnRespawnedPowerPellet(pos.x, pos.y);
    }
    if (this.fireDueEchoes(delta)) {
      return;
    }
    this.eatDragMs = tickEatDrag(this.eatDragMs, delta);
    this.turnTuning.tick(delta);
    const levelSpeedMul = speedLevelMultiplier(this.levelIndex, this.currentTuning);
    const hyperspeedMul =
      this.runUpgrades.hyperspeedTurnDelayMs > 0
        ? 0
        : levelSpeedMul * hyperspeedMultiplier(this.effectiveUpgrades());
    const playerSpeedMul = hyperspeedActive(this.runUpgrades)
      ? hyperspeedMul * (warping ? 0 : 1)
      : levelSpeedMul *
        playerSpeedMultiplier(this.effectiveUpgrades()) *
        cellSpeedMultiplier(this.effectiveUpgrades(), enteringEmptyCell(this.world)) *
        (speedBurstActive(this.runUpgrades) ? speedBurstMultiplier(this.effectiveUpgrades()) : 1) *
        eatDragMultiplier(this.eatDragMs, this.currentTuning) *
        this.turnTuning.speedMultiplier(this.effectiveUpgrades()) *
        (warping ? 0 : 1);
    applyPlayerSpeed(this.world, playerSpeedMul, this.currentTuning);
    applyGhostSpeed(this.world, this.pelletProgress.pelletsRemaining, this.levelIndex, {
      ghostSpeedMul:
        (this.bossState === null ? levelSpeedMul : 1) *
        ghostSpeedMultiplier(this.effectiveUpgrades()),
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      heldGhostEids: heldGhostEids(this.ghostCornerWarps),
      frightenedGhostEids: frightenedGhostEids(this.runUpgrades),
      tunnelSpeedRatio: ghostTunnelSpeedRatio(this.effectiveUpgrades()),
      tuning: this.currentTuning,
    });
    const playerSolidsOverride = wallPassActive(this.runUpgrades)
      ? wallPassSolids(this.effectiveUpgrades())
      : undefined;
    if (this.bossState?.def.chained === false) {
      bossGhostBlock(this.world);
    }
    const facingBeforeMove = playerFacing(this.world);
    const positionBeforeMove = this.playerPosition();
    const blockTunnelRow = this.closedGatedTunnelRow();
    const moveFrame = (frameDelta: number): void =>
      movement(
        this.world,
        frameDelta,
        playerSolidsOverride,
        false,
        playerPreTurnPx(this.currentTuning),
        this.ghostsBlockedFromTunnels(),
        blockTunnelRow,
      );
    if (hyperspeedActive(this.runUpgrades)) {
      this.moveHyperspeed(delta, moveFrame);
    } else {
      moveFrame(delta);
    }
    this.notePlayerMovement(positionBeforeMove, hasInput, warping, delta);
    this.noteTunnelExit(positionBeforeMove);
    this.tickSpeedTrail(delta);
    this.emitTurnSparks(
      this.turnTuning.afterMove(
        this.world,
        this.effectiveUpgrades(),
        facingBeforeMove,
        playerFacing(this.world),
      ),
    );
    if (this.tunnelDashAnim !== null) {
      const positionBeforeDash = this.playerPosition();
      this.tunnelDashAnim = tickTunnelDashAnimation(
        this.world,
        this.tunnelDashAnim,
        delta,
        playerSpeed(this.currentTuning) * TUNNEL_DASH_SPEED_MUL,
      );
      this.noteTunnelExit(positionBeforeDash);
    } else if (
      hasUpgrade(this.effectiveUpgrades(), "passiveTunnelDash") &&
      !this.timedTunnelBlocksPlayerDash()
    ) {
      const dash = applyTunnelDash(this.world);
      if (dash !== null) {
        this.recorder.tunnelDash();
        this.recorder.powerPellets("tunnelDash", dash.sweptPowerRemoved);
        if (dash.sweptPelletEids.length > 0) {
          for (const eid of dash.sweptPelletEids) {
            this.releaseDrawable(eid);
          }
          this.emit({
            type: "pelletSfx",
            previousCollected: this.lifetimeCollected,
            removed: dash.sweptPelletEids.length,
            powerRemoved: dash.sweptPowerRemoved,
          });
          if (hasUpgrade(this.effectiveUpgrades(), "passivePowerPelletRecharge")) {
            this.pendingPowerPelletRespawns = queuePowerPelletRespawns(
              this.pendingPowerPelletRespawns,
              dash.sweptPowerPositions,
              secondChompMs(this.effectiveUpgrades()),
            );
          }
          const dashStreakFires = this.applyStreakCells(dash.sweptCells);
          const collectResult = applyPelletCollect(
            this.pelletProgress,
            dash.sweptPelletEids.length,
            noRequiredPelletsLeft(this.world),
          );
          this.pelletProgress = collectResult.progress;
          this.lifetimeCollected += dash.sweptPelletEids.length;
          if (
            dash.sweptPowerRemoved > 0 &&
            this.resolvePowerPelletTrigger(dash.sweptPowerRemoved)
          ) {
            return;
          }
          if (this.fireStreakEngine(dashStreakFires)) {
            return;
          }
          if (collectResult.shouldRecordClear) {
            this.triggerLevelClear();
            return;
          }
        }
        this.tunnelDashAnim = { targetX: dash.animateToX, wrapToX: dash.wrapToX, y: dash.y };
      }
    }

    this.checkStreakCell();

    if (ghostExitHouse(this.world) && !this.ghostModeClock.active) {
      this.ghostModeClock = startGhostModeClock(this.levelIndex, this.currentTuning);
    }

    this.clock = tickRunClock(this.clock, hasInput, delta, this.currentTuning);
    this.emit({ type: "timer" });

    const playerFrame = mergePlayerPelletFrames(
      this.hyperspeedPellets,
      collectPellets(this.world, {
        radiusBonusPx: pelletCollectRadiusBonusPx(this.effectiveUpgrades()),
        solids: getActiveLayout().playerSolids,
      }),
    );
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    const ghostFrame = ghostHarvestActive(this.runUpgrades)
      ? harvestPelletsByGhosts(this.world)
      : { powerRemoved: 0, removedEids: [], removedPowerPositions: [], removedSnaps: [] };
    const powerRemoved = playerFrame.powerRemoved + ghostFrame.powerRemoved;
    const removedPelletEids = [...playerFrame.removedEids, ...ghostFrame.removedEids];
    const removedPowerPositions = [
      ...playerFrame.removedPowerPositions,
      ...ghostFrame.removedPowerPositions,
    ];
    for (const snap of playerFrame.removedSnaps) {
      this.releasePelletSnap(snap);
    }
    for (const eid of ghostFrame.removedEids) {
      this.releaseDrawable(eid);
    }
    let streakFires = 0;
    if (playerFrame.removedCells.length > 0) {
      streakFires = this.applyStreakCells(playerFrame.removedCells);
    } else {
      this.bonus = tickStreakIdle(this.bonus, delta, this.currentTuning.bonusStreakIdleMs);
    }
    const removed = removedPelletEids.length;
    this.eatDragMs = eatDragAfterCollect(
      this.eatDragMs,
      removed - powerRemoved,
      powerRemoved,
      this.currentTuning,
    );
    if (removed > 0) {
      this.emit({
        type: "pelletSfx",
        previousCollected: this.lifetimeCollected,
        removed,
        powerRemoved,
      });
    }
    if (hasUpgrade(this.effectiveUpgrades(), "passivePowerPelletRecharge")) {
      this.pendingPowerPelletRespawns = queuePowerPelletRespawns(
        this.pendingPowerPelletRespawns,
        removedPowerPositions,
        secondChompMs(this.effectiveUpgrades()),
      );
    }
    this.recorder.powerPellets("player", playerFrame.powerRemoved);
    this.recorder.powerPellets("ghostHarvest", ghostFrame.powerRemoved);
    const powerEffects = this.applyPowerEffects(this.bankAndCountPickupFires(powerRemoved));
    let bonusRemoved = 0;
    if (powerEffects.collectExtraPellets > 0) {
      const bonusSnaps = collectExtraPellets(this.world, powerEffects.collectExtraPellets);
      for (const snap of bonusSnaps) {
        this.releasePelletSnap(snap);
      }
      bonusRemoved = bonusSnaps.length;
      if (bonusRemoved > 0) {
        this.emitMunch();
      }
    }
    const transferred = this.applyRemoteTransferStep(removed + bonusRemoved);
    const totalRemoved = removed + bonusRemoved + transferred;
    const collectResult = applyPelletCollect(
      this.pelletProgress,
      totalRemoved,
      noRequiredPelletsLeft(this.world),
    );
    this.pelletProgress = collectResult.progress;
    if (totalRemoved > 0) {
      this.lifetimeCollected += totalRemoved;
    }
    this.notePellets();
    if (this.fireStreakEngine(streakFires)) {
      return;
    }

    const modeStep = resolveGhostModeStep(this.ghostModeClock, delta, this.currentTuning);
    this.ghostModeClock = modeStep.clock;
    if (modeStep.mode !== this.previousEffectiveGhostMode) {
      forceGhostReverse(this.world, this.ghostsBlockedFromTunnels(), undefined, blockTunnelRow);
      this.previousEffectiveGhostMode = modeStep.mode;
    } else {
      ghostAi(
        this.world,
        modeStep.mode,
        this.pelletProgress.pelletsRemaining,
        this.currentTuning,
        this.ghostsBlockedFromTunnels(),
        frightenedGhostEids(this.runUpgrades),
        blockTunnelRow,
      );
      frightenedGhostAi(
        this.world,
        frightenedGhostEids(this.runUpgrades),
        this.random.stream("frightened", this.levelIndex),
        this.ghostsBlockedFromTunnels(),
        blockTunnelRow,
      );
    }
    for (let recalled = 0; recalled < powerEffects.recallGhostCount; recalled += 1) {
      this.recordRecall(
        recallClosestGhostToHouse(
          this.world,
          this.ghostReleaseClock,
          this.pelletProgress.boardCollected,
          this.afterLifeRelease,
          releaseAdds,
          frozenGhostEid(this.runUpgrades),
        ),
      );
    }
    if (powerEffects.cornerTeleportHoldMs !== null) {
      this.teleportGhostsToCorners(powerEffects.cornerTeleportHoldMs);
    }
    if (powerEffects.warpPlayerFarthest) {
      this.warpPlayer();
    }

    const stacksFruit = fruitStacksSideBySide(this.effectiveUpgrades());
    const fruitTick = tickFruitPresence(
      this.fruitPresence,
      this.pelletProgress.boardCollected,
      delta,
      this.levelIndex,
      {
        feastBase: fruitFeastThresholds(this.effectiveUpgrades()),
        lifetimeMul: fruitLifetimeMultiplier(this.effectiveUpgrades()),
        persist: fruitPersistsUntilLevelEnd(this.effectiveUpgrades()),
        stack: stacksFruit,
        tuning: this.currentTuning,
      },
    );
    if (fruitTick.action === "spawn" || fruitTick.action === "replace") {
      this.spawnFruitEntity(stacksFruit);
    }

    const removedFruitEids = collectFruit(this.world);
    for (const eid of removedFruitEids) {
      this.releaseDrawable(eid);
    }
    const fruitEaten = removedFruitEids.length + this.hyperspeedFruitEaten;
    this.hyperspeedFruitEaten = 0;
    if (fruitEaten > 0) {
      this.emitMunch();
      this.recorder.fruitEaten(fruitEaten);
      const fruitQuarters = fruitQuartersPerFruit(this.effectiveUpgrades());
      if (fruitQuarters !== null) {
        this.quarters += fruitEaten * fruitQuarters;
        this.recorder.quarters("fruit", fruitEaten * fruitQuarters);
        this.emit({ type: "quarters", pulse: false });
      } else {
        const fruitCharge = addBonusCharge(this.bonus, fruitEaten * FRUIT_BONUS_CHARGE);
        this.emit({ type: "fruitBonus" });
        this.applyBonus({ bar: fruitCharge.bar, tier: 0, filled: fruitCharge.filled });
      }
      this.fruitPresence = markFruitCollected(
        fruitTick.state,
        fruitPositions(this.world).length > 0,
      );
      if (fruitPowerConvertsPellet(this.effectiveUpgrades())) {
        this.applyPelletSurge(1, "fruitPowerConvert");
      }
      if (hasUpgrade(this.effectiveUpgrades(), "fruitPowerPellet")) {
        this.recorder.powerPellets("fruit", 1);
        if (this.resolvePowerPelletTrigger(1)) {
          return;
        }
      }
    } else if (fruitTick.action === "despawn") {
      this.clearFruitEntities();
      this.fruitPresence = fruitTick.state;
    } else {
      this.fruitPresence = fruitTick.state;
    }

    if (collectResult.shouldRecordClear) {
      this.triggerLevelClear();
      return;
    }

    this.tickBoss();
    this.eatFrightenedGhosts();

    const catchOptions = this.catchOptions();
    const caughtBy = catchPlayer(this.world, catchOptions) ?? chainCatch(this.world, catchOptions);
    this.emitDraw();

    if (caughtBy === null) {
      this.recorder.nearMisses(this.world, getActiveLayout().tileSize);
      this.payNearMisses(catchOptions);
    } else {
      if (this.breakShield() || this.breakHyperspeedShield()) {
        return;
      }
      const deathCell = playerCell(this.world);
      const ghostsOut = query(this.world, [Ghost, GhostPhase]).filter(
        (eid) => GhostPhase.value[eid] !== GHOST_PHASE.inHouse,
      ).length;
      let harvestedCount = 0;
      if (hasUpgrade(this.effectiveUpgrades(), "passiveDeathsHarvest")) {
        const harvested = harvestNearbyPellets(
          this.world,
          deathsHarvestRadiusTiles(this.effectiveUpgrades()),
        );
        harvestedCount = harvested.length;
        if (harvested.length > 0) {
          for (const eid of harvested) {
            this.releaseDrawable(eid);
          }
          const harvestResult = applyPelletCollect(
            this.pelletProgress,
            harvested.length,
            noRequiredPelletsLeft(this.world),
          );
          this.pelletProgress = harvestResult.progress;
          this.lifetimeCollected += harvested.length;
          if (harvestResult.shouldRecordClear) {
            this.triggerLevelClear();
            return;
          }
        }
      }
      this.fellAt = this.playerPosition();
      this.caughtByEid = caughtBy;
      this.emit({ type: "loopStop", id: "gameplayMusic" });
      const defied = defyDeathActive(this.runUpgrades);
      const boughtFor =
        defied || this.options.infiniteLives
          ? null
          : lastLifeSaveCost(this.lives, this.quarters, moneyTalksCost(this.effectiveUpgrades()));
      if (boughtFor !== null) {
        this.moneyTalksSpend = {
          elapsedMs: 0,
          count: boughtFor,
          paid: 0,
          quartersBefore: this.quarters,
        };
        this.tickMoneyTalks(0);
      }
      const saved = defied || boughtFor !== null;
      this.reviveSplashPending = saved;
      this.emit({ type: "sfx", id: saved ? "revive" : "death" });
      const result =
        this.options.infiniteLives || saved
          ? { lives: this.lives, gameOver: false }
          : livesRemainingAfterCatch(this.lives);
      this.lives = result.lives;
      this.emit({ type: "lives", pulse: false });
      const bountyPaid = !result.gameOver && this.payDeathsBounty();
      this.recorder.death({
        col: deathCell?.col ?? -1,
        row: deathCell?.row ?? -1,
        ghost: ghostName(this.world, caughtBy),
        bossGhost: hasComponent(this.world, caughtBy, BossGhost),
        countdown: this.clock.remaining,
        pelletsLeft: this.pelletProgress.pelletsRemaining,
        ghostMode: nameOf(GHOST_AI_MODE, this.previousEffectiveGhostMode),
        elroyTier: elroyTier(this.pelletProgress.pelletsRemaining, this.currentTuning),
        ghostsOut,
        livesAfter: this.lives,
        defied,
        moneyTalks: boughtFor !== null,
        bountyPaid,
        harvested: harvestedCount,
      });
      if (result.gameOver) {
        this.saveRun();
        this.recorder.finish("death");
        this.emitRunLog();
      }
      this.death = beginDeathSequence(result.gameOver);
    }
  }

  private catchOptions(): CatchOptions {
    return {
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      skipGhostEids: glidingGhostEids(this.ghostCornerWarps),
      edibleGhostEids: frightenedGhostEids(this.runUpgrades),
      playerInvulnerable: this.options.godMode || playerIsInvulnerable(this.runUpgrades),
    };
  }

  private releaseAdds(): GhostReleaseAdds {
    const haunted = hauntedGhostEid(this.runUpgrades);
    return {
      delayAddMs: ghostHouseReleaseDelayAddMs(this.effectiveUpgrades()),
      clydePelletAdd: ghostHouseClydePelletAdd(this.effectiveUpgrades()),
      tuning: this.currentTuning,
      heldGhostEids: [...(haunted === null ? [] : [haunted]), ...this.runUpgrades.hunterHeldEids],
    };
  }

  private eatFrightenedGhosts(): void {
    const gliding = glidingGhostEids(this.ghostCornerWarps);
    const eaten = edibleGhostsTouchingPlayer(
      this.world,
      new Set([...frightenedGhostEids(this.runUpgrades)].filter((eid) => !gliding.has(eid))),
    );
    for (const eid of eaten) {
      if (eid === frozenGhostEid(this.runUpgrades)) {
        this.runUpgrades = { ...this.runUpgrades, freezeRemainingMs: 0, frozenGhostEid: null };
      }
      const from = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
      const ate = eatFrightenedGhost(
        this.runUpgrades,
        eid,
        hunterHoldsEaten(this.effectiveUpgrades()),
      );
      this.runUpgrades = ate.state;
      sendGhostToHouse(
        this.world,
        eid,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        this.releaseAdds(),
      );
      const to = { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
      this.ghostCornerWarps = mergeGhostCornerWarps(this.ghostCornerWarps, [
        { eid, glide: startWarpGlide(from, to), holdMs: 0 },
      ]);
      const charged = addBonusCharge(this.bonus, ate.charge);
      this.applyBonus({ bar: charged.bar, tier: 0, filled: charged.filled }, "hunter");
      this.recorder.activation("ghostEaten");
    }
    if (eaten.length > 0) {
      this.emitMunch();
    }
  }

  private ghostsBlockedFromTunnels(): boolean {
    return (
      this.bossState?.def.chained === true || ghostsBlockedFromTunnels(this.effectiveUpgrades())
    );
  }

  private timedTunnelWallPassLoopActive(): boolean {
    return wallPassActive(this.runUpgrades) && wallPassLoopOwned(this.effectiveUpgrades());
  }

  private resetTimedTunnel(): void {
    this.timedTunnelElapsedMs = 0;
    if (!isTimedTunnelLevel(this.levelIndex)) {
      this.timedTunnelGatedRow = null;
      return;
    }
    this.timedTunnelGatedRow = pickTimedTunnelRow(
      horizontalTunnelRows(),
      this.random.stream("timedTunnel", this.levelIndex),
    );
  }

  private tickTimedTunnel(deltaMs: number): void {
    if (this.timedTunnelGatedRow === null) {
      return;
    }
    const phaseBefore = timedTunnelPhase(this.timedTunnelElapsedMs);
    this.timedTunnelElapsedMs += deltaMs;
    const phaseAfter = timedTunnelPhase(this.timedTunnelElapsedMs);
    if (
      phaseBefore !== "closed" &&
      phaseAfter === "closed" &&
      !this.timedTunnelWallPassLoopActive()
    ) {
      this.cancelTunnelDashForTimedClose();
    }
  }

  private closedGatedTunnelRow(): number | null {
    if (
      this.timedTunnelGatedRow === null ||
      timedTunnelPhase(this.timedTunnelElapsedMs) !== "closed" ||
      this.timedTunnelWallPassLoopActive()
    ) {
      return null;
    }
    return this.timedTunnelGatedRow;
  }

  private timedTunnelBlocksPlayerDash(): boolean {
    const closedRow = this.closedGatedTunnelRow();
    if (closedRow === null) {
      return false;
    }
    const at = this.playerPosition();
    return at !== null && worldToRow(at.y) === closedRow;
  }

  private cancelTunnelDashForTimedClose(): void {
    if (this.tunnelDashAnim === null || this.timedTunnelGatedRow === null) {
      return;
    }
    const eid = query(this.world, [Player, Position])[0];
    if (eid === undefined) {
      return;
    }
    if (worldToRow(Position.y[eid] ?? 0) !== this.timedTunnelGatedRow) {
      return;
    }
    this.tunnelDashAnim = null;
    const clamped = clampToGridCenters(Position.x[eid] ?? 0, Position.y[eid] ?? 0);
    Position.x[eid] = clamped.x;
    Position.y[eid] = clamped.y;
  }

  private timedTunnelSnapshot(): {
    row: number;
    phase: TimedTunnelPhase;
    remainingMs: number;
  } | null {
    if (this.timedTunnelGatedRow === null) {
      return null;
    }
    return {
      row: this.timedTunnelGatedRow,
      phase: timedTunnelPhase(this.timedTunnelElapsedMs),
      remainingMs: timedTunnelPhaseRemainingMs(this.timedTunnelElapsedMs),
    };
  }

  private timedTunnelRenderState(): {
    row: number;
    phase: TimedTunnelPhase;
    gateVisible: boolean;
  } | null {
    if (this.timedTunnelGatedRow === null) {
      return null;
    }
    const phase = timedTunnelPhase(this.timedTunnelElapsedMs);
    return {
      row: this.timedTunnelGatedRow,
      phase,
      gateVisible: timedTunnelGateVisible(phase, this.timedTunnelElapsedMs),
    };
  }

  private checkStreakCell(): void {
    const cell = playerCell(this.world);
    const last = this.lastPlayerCell;
    if (cell !== null && last !== null && (cell.col !== last.col || cell.row !== last.row)) {
      this.bonus = enterCell(this.bonus, cell, pelletAtCell(this.world, cell));
    }
    this.lastPlayerCell = cell;
  }

  private applyBonus(result: BonusResult, source: QuarterSource = "bonusBar"): void {
    this.bonus = result.bar;
    this.recorder.bonus(result.tier, result.filled);
    if (result.filled > 0) {
      this.quarters += result.filled;
      this.recorder.quarters(source, result.filled);
      this.emit({ type: "quarters", pulse: false });
    }
    if (result.tier > 0 || result.filled > 0) {
      this.emit({ type: "bonus", tier: result.tier, filled: result.filled });
    }
  }

  private applyStreakCells(cells: readonly Cell[]): number {
    const prevStreak = this.bonus.streak;
    this.applyBonus(applyStreakPellets(this.bonus, cells));
    const every = streakEngineEvery(this.effectiveUpgrades());
    if (every === null) {
      return 0;
    }
    for (const pop of streakPops(prevStreak, this.bonus.streak, every)) {
      const cell = cells[pop.cellIndex]!;
      this.streakPopCount += 1;
      this.lastStreakPop = pop.value;
      this.emit({
        type: "streakPop",
        value: pop.value,
        x: cellCenterX(cell.col),
        y: cellCenterY(cell.row),
      });
    }
    return streakEngineFires(prevStreak, this.bonus.streak, every);
  }

  private fireStreakEngine(fires: number): boolean {
    for (let fired = 0; fired < fires; fired += 1) {
      this.recorder.activation("streakEngine");
      const ended = this.resolvePowerPelletTrigger(1);
      this.runUpgrades = applyStreakEngineInvuln(this.runUpgrades, this.effectiveUpgrades());
      if (ended) {
        return true;
      }
    }
    return false;
  }

  private payDeathsBounty(): boolean {
    const charge = deathsBountyCharge(this.effectiveUpgrades(), this.deathsThisBoard);
    this.deathsThisBoard += 1;
    const charged = addBonusCharge(this.bonus, charge);
    this.applyBonus({ bar: charged.bar, tier: 0, filled: charged.filled }, "deathsBounty");
    return charge > 0;
  }

  private payNearMisses(catchOptions: CatchOptions): void {
    const charge = nearMissCharge(this.effectiveUpgrades());
    if (charge === 0) {
      return;
    }
    const step = stepNearMisses(this.world, this.nearMissPasses, catchOptions);
    this.nearMissPasses = step.passes;
    if (step.completed === 0) {
      return;
    }
    this.nearMissesPaid += step.completed;
    const charged = addBonusCharge(this.bonus, step.completed * charge);
    this.applyBonus({ bar: charged.bar, tier: 0, filled: charged.filled }, "nearMiss");
  }

  private resetStreak(): void {
    this.bonus = breakStreak(this.bonus);
    this.lastPlayerCell = null;
    this.nearMissPasses = createNearMissPasses();
  }

  private applyRemoteTransferStep(removedThisFrame: number): number {
    const every = remoteTransferEvery(this.effectiveUpgrades());
    if (every === null) {
      return 0;
    }
    const before = this.remoteTransferCounter;
    this.remoteTransferCounter += removedThisFrame;
    const triggers = remoteTransferTriggers(before, this.remoteTransferCounter, every);
    const snaps = applyRemoteTransference(this.world, triggers);
    for (const snap of snaps) {
      this.releasePelletSnap(snap);
    }
    if (snaps.length > 0) {
      this.emit({
        type: "pelletSfx",
        previousCollected: this.lifetimeCollected + removedThisFrame,
        removed: snaps.length,
        powerRemoved: 0,
      });
      this.remoteTransferCounter += snaps.length;
    }
    return snaps.length;
  }

  private emitMunch(): void {
    this.emit({ type: "sfx", id: "pelletMunch" });
    this.emit({ type: "sfx", id: "pelletMunch2" });
  }

  private enterStore(): void {
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    activateAsciiLayout(STORE_MAZE_ASCII, "store");
    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    this.eatDragMs = 0;
    this.turnTuning.reset();
    this.pendingPowerPelletRespawns = [];
    this.tunnelDashAnim = null;
    this.resetHyperspeedMovement();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.resetStreak();
    this.emit({ type: "resetBoard" });
    this.world = createWorld();
    spawnWalls(this.world);
    spawnPlayer(this.world);

    this.applyLifeRegen(STORE_REGEN_AMOUNT);
    this.store = createStoreState(
      parseStoreSlots(STORE_MAZE_ASCII),
      this.runUpgrades.owned,
      this.random.stream("storeStock", this.levelIndex),
      this.levelIndex === STORE_FIRST_LEVEL,
      storeLifeRoom(
        this.lives,
        lifeFloorBonus(this.effectiveUpgrades()),
        this.options.maxLives ?? DEFAULT_MAX_LIVES,
      ),
    );
    this.payInterest();
    this.recorder.storeOpened(this.levelIndex, this.quarters, this.store.slots.map(storeSlotLabel));
    this.emit({ type: "storeOpened" });
    this.timerVisible = false;
    this.emit({ type: "timerVisible", visible: false });
    this.suppressInputUntilKeyRelease = true;
    this.showLevelBanner("STORE");
    this.emit({ type: "musicAfterFanfare", id: "storeMusic" });
    this.drawStore();
  }

  private payInterest(): void {
    const interest = interestPayout(this.effectiveUpgrades(), this.quarters);
    if (interest <= 0) {
      return;
    }
    this.quarters += interest;
    this.recorder.quarters("interest", interest);
    this.interestPop = { count: interest, elapsedMs: 0 };
  }

  private tickInterestPop(delta: number): void {
    const pop = this.interestPop;
    if (pop === null) {
      return;
    }
    const before = interestCoinsShown(pop);
    pop.elapsedMs += delta;
    const shown = interestCoinsShown(pop);
    if (shown > before) {
      this.emit({ type: "quarters", pulse: true });
    }
    if (shown >= pop.count) {
      this.interestPop = null;
    }
  }

  private tickStore(input: SimInput, delta: number): void {
    this.tickInterestPop(delta);
    if (this.storeExitSlide !== null) {
      this.tickStoreExitSlide(delta);
      return;
    }
    const confirming = this.storeConfirmOpen();
    const layout = getActiveLayout();
    if (input.storePointer) {
      this.storeRoute = storeExitCellAt(
        layout.playerSolids,
        worldToCol(input.storePointer.x),
        worldToRow(input.storePointer.y),
      );
    }
    if (confirming || input.storeCancelRoute || anyKeyHeld(input.keys)) {
      this.storeRoute = null;
    }
    const from = playerCell(this.world);
    const store = this.store!;
    const routeStep =
      this.storeRoute &&
      from &&
      storeRouteStep(
        layout.playerSolids,
        from,
        this.storeRoute,
        (col, row) => slotIndexAtCell(store, col, row) !== null,
      );
    if (this.storeRoute && !routeStep) {
      this.storeRoute = null;
    }
    if (confirming) {
      clearPlayerDirectionInput(this.world);
    } else if (routeStep) {
      steerPlayer(this.world, routeStep);
    } else {
      if (this.suppressInputUntilKeyRelease && !anyKeyHeld(input.keys)) {
        this.suppressInputUntilKeyRelease = false;
      }
      if (!this.suppressInputUntilKeyRelease) {
        applyHeldKeys(this.world, input.keys, { diagonalAllowed: true, stopOnRelease: true });
      }
    }
    applyPlayerSpeed(
      this.world,
      speedLevelMultiplier(this.levelIndex, this.currentTuning) *
        playerSpeedMultiplier(this.effectiveUpgrades()) *
        cellSpeedMultiplier(this.effectiveUpgrades(), enteringEmptyCell(this.world)),
      this.currentTuning,
    );
    movement(this.world, delta, undefined, true);

    const cell = playerCell(this.world);
    const exit = cell && storeExitDirection(cell.col, cell.row, layout.cols, layout.rows);
    if (exit) {
      this.storeRoute = null;
      this.storeExitSlide = { ...exit, traveledPx: 0 };
      this.emit({ type: "storeSync", prompt: null });
      this.drawStore(storeExitAlpha(0));
      return;
    }

    const step = storeStep(
      this.store!,
      {
        col: cell?.col ?? -1,
        row: cell?.row ?? -1,
        toggle: confirming && input.storeToggle,
        enter: confirming && input.storeConfirm,
        pick: confirming ? (input.storeChoice ?? null) : null,
        click: confirming ? null : (input.storeClick ?? null),
        moving: anyKeyHeld(input.keys) || this.storeRoute !== null,
        quarters: this.quarters,
        owned: this.runUpgrades.owned,
      },
      this.random.stream("storePurchase", this.levelIndex),
    );
    this.store = step.state;
    if (step.purchase !== null) {
      this.applyStorePurchase(step.purchase);
    }
    if (confirming && !this.storeConfirmOpen()) {
      this.suppressInputUntilKeyRelease = true;
    }
    this.emit({
      type: "storeSync",
      prompt: promptView(this.store, this.quarters, this.runUpgrades.owned),
    });
    this.drawStore();
  }

  private tickStoreExitSlide(delta: number): void {
    const slide = this.storeExitSlide!;
    slide.traveledPx += slidePlayer(this.world, slide.dx, slide.dy, delta);
    const traveledTiles = slide.traveledPx / getActiveLayout().tileSize;
    if (traveledTiles >= STORE_EXIT_SLIDE_TILES) {
      this.exitStore();
      return;
    }
    this.drawStore(storeExitAlpha(traveledTiles));
  }

  private storeConfirmOpen(): boolean {
    return (
      this.store !== null &&
      promptView(this.store, this.quarters, this.runUpgrades.owned)?.kind === "confirm"
    );
  }

  private applyStorePurchase(purchase: StorePurchase): void {
    this.recorder.storePurchase(purchase);
    this.quarters -= purchase.price;
    this.interestPop = null;
    this.emit({ type: "quarters", pulse: false });
    this.emitMunch();
    if (purchase.kind === "life") {
      this.lives += 1;
      this.emit({ type: "lives", pulse: true });
      return;
    }
    let id: UpgradeId;
    if (purchase.kind === "enhance") {
      id = enhancedIdOf(purchase.targetId);
      this.recorder.lost(purchase.targetId, this.levelIndex);
      this.recorder.gained(id, "enhance", this.levelIndex);
      this.runUpgrades = enhanceUpgrade(this.runUpgrades, purchase.targetId);
      this.payEnhanceLives(purchase.targetId);
      this.topUpStartingShields();
    } else {
      if (purchase.kind === "swap") {
        this.recorder.lost(purchase.outgoingId, this.levelIndex);
        this.runUpgrades = revokeUpgrade(this.runUpgrades, purchase.outgoingId);
      }
      id = purchase.kind === "swap" ? purchase.incomingId : purchase.id;
      this.recorder.gained(id, "store", this.levelIndex);
      this.runUpgrades = grantUpgrade(this.runUpgrades, id);
      this.applyGrantEffects(id);
      this.grantSpecialistLives();
    }
    this.emit({
      type: "lives",
      pulse: grantLivesForUpgrade(id) > 0 || baseIdOf(id) === "passiveMyogenesis",
    });
    this.recordSeenUpgrades();
    this.emit({ type: "upgrades" });
    this.emit({ type: "storePurchased", id });
  }

  private exitStore(): void {
    this.closeStore();
    this.recorder.storeClosed(this.quarters);
    this.emitRunLog();
    if (this.levelIndex >= MAX_LEVEL) {
      this.beginRunComplete();
    } else {
      this.timerVisible = true;
      this.emit({ type: "timerVisible", visible: true });
      this.advanceToNextLevel();
    }
  }

  private closeStore(): void {
    if (this.interestPop !== null) {
      this.interestPop = null;
      this.emit({ type: "quarters", pulse: false });
    }
    this.storeExitSlide = null;
    this.storeRoute = null;
    this.emit({ type: "storeClosed" });
    this.store = null;
  }

  private drawStore(playerAlpha?: number): void {
    this.emitDraw({
      frozenGhostEid: null,
      playerInvulnRemainingMs: 0,
      wallPassActive: false,
      playerAlpha,
    });
  }

  private startBoard(layoutOverride: MazeLayoutId | null = null): void {
    this.resetStreak();
    this.deathsThisBoard = 0;
    this.nearMissesPaid = 0;
    this.topUpStartingShields();
    const boss = isBossLevel(this.levelIndex)
      ? pickBoss(this.options.boss, this.random.stream("bossPick", this.levelIndex))
      : null;
    const selection = resolveBoardSelection(this.levelIndex, layoutOverride, this.random.seed);
    let layoutLabel = "maze2";
    if (selection.kind === "static") {
      activateLayout(selection.id);
      layoutLabel = selection.id;
    } else {
      const generated = this.generateBoard(selection.seed, boss);
      if (generated) {
        try {
          const ascii = isInvertedMazeLevel(this.levelIndex)
            ? invertMazeAscii(generated.ascii)
            : generated.ascii;
          activateAsciiLayout(ascii);
          layoutLabel = `gen:${generated.seedUsed}`;
        } catch (error) {
          console.warn(
            `maze activate failed for seed ${generated.seedUsed}; falling back to maze2`,
            error,
          );
          activateLayout("maze2");
        }
      } else {
        console.warn(
          `maze generate failed after ${GENERATE_MAX_ATTEMPTS} attempts for seed ${selection.seed}; falling back to maze2`,
        );
        activateLayout("maze2");
      }
    }
    this.emit({ type: "resetBoard" });
    this.world = createWorld();
    spawnWalls(this.world);
    spawnBoardPellets(this.world);
    spawnPlayer(this.world);
    this.bossState = null;
    if (boss !== null) {
      this.startBoss(boss);
      this.recordSeen([...boss.ghostKinds]);
    } else {
      const ghostKinds =
        this.options.ghosts ?? ghostKindsForLevel(this.levelIndex, this.secondGhostKind);
      for (const kind of ghostKinds) {
        this.spawnGhost(kind);
      }
      this.recordSeen(ghostKinds);
    }

    this.clock = createRunClock(this.currentTuning);
    this.recorder.beginLevel({
      level: this.levelIndex,
      layout: layoutLabel,
      inverted: selection.kind !== "static" && isInvertedMazeLevel(this.levelIndex),
      boss: boss !== null,
      countdownStart: this.clock.remaining,
      livesStart: this.lives,
    });
    this.ghostReleaseClock = createGhostReleaseClock(this.levelIndex);
    this.ghostModeClock = createGhostModeClock(this.levelIndex, this.currentTuning);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.remoteTransferCounter = 0;
    this.fruitPresence = createFruitPresence();
    this.pendingPowerPelletRespawns = [];
    this.tunnelDashAnim = null;
    this.resetHyperspeedMovement();
    this.resetTimedTunnel();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.afterLifeRelease = false;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    this.death = null;
    this.finishMoneyTalks();
    this.suppressInputUntilKeyRelease = false;
    this.emit({ type: "timer" });

    this.applyPelletSurge(pelletSurgeCount(this.effectiveUpgrades()));
    if (this.bossState !== null) {
      this.tagBossPellets(this.bossState);
    }
    tagOptionalPellets(
      this.world,
      this.bossState !== null ? null : lazyLooperRings(this.effectiveUpgrades()),
    );
  }

  private generateBoard(
    seed: string,
    boss: BossDef | null,
  ): ReturnType<typeof generateMazeAsciiWithRetries> {
    if (boss?.tunnelCount == null) {
      return generateMazeAsciiWithRetries(seed);
    }
    const bossBoard = generateMazeAsciiWithRetries(seed, GENERATE_MAX_ATTEMPTS, {
      tunnelCount: boss.tunnelCount,
    });
    if (bossBoard !== null) {
      return bossBoard;
    }
    console.warn(
      `boss maze with ${boss.tunnelCount} tunnels failed for seed ${seed}; using a regular board`,
    );
    return generateMazeAsciiWithRetries(seed);
  }

  private startBoss(boss: BossDef): void {
    const { cols } = getActiveLayout();
    this.bossMouths = bossTunnelMouths(horizontalTunnelRows(), cols);
    this.bossState = createBossState(boss, bossStartGhosts(boss, this.currentTuning));
    this.spawnBossGhostsForLife();
  }

  private spawnBossGhostsForLife(): void {
    if (this.bossState === null) {
      return;
    }
    const { def, ghostCount } = this.bossState;
    const { house, tunnel } = splitBossGhosts(def, ghostCount);
    for (let i = 0; i < house; i += 1) {
      this.spawnBossGhostInHouse(
        bossGhostKind(def, i),
        BLINKY_RELEASE_DELAY_MS + i * def.houseReleaseStaggerMs,
      );
    }
    this.bossState = { ...this.bossState, pendingSpawns: tunnel };
  }

  private tagBossPellets(state: BossState): void {
    const spawnPellets = bossStage(state.def, state.stageIndex).spawnPellets;
    const regular = [...query(this.world, [Pellet, Position])].filter(
      (eid) => Drawable.id[eid] === PELLET_DRAWABLE_ID,
    );
    const cells = regular.map((eid) => ({
      eid,
      col: worldToCol(Position.x[eid] ?? 0),
      row: worldToRow(Position.y[eid] ?? 0),
    }));
    const picks = pickBossPelletCells(cells, getActiveLayout().playerSpawn, spawnPellets);
    if (picks.length < spawnPellets) {
      console.warn(`only ${picks.length} boss pellets fit this board`);
    }
    for (const pick of picks) {
      addComponent(this.world, pick.eid, BossPellet);
      Drawable.id[pick.eid] = BOSS_PELLET_DRAWABLE_ID;
    }
    this.bossState = { ...state, bossPelletsRemaining: picks.length };
  }

  private tickBoss(): void {
    if (this.bossState === null) {
      return;
    }
    let state = recordBossPelletsEaten(this.bossState, countBossPellets(this.world));
    while (state.pendingSpawns > 0) {
      const kind = bossGhostKind(state.def, state.ghostCount - state.pendingSpawns);
      if (this.bossMouths.length === 0) {
        this.spawnBossGhostInHouse(kind, 0);
      } else {
        const index = pickFreeBossMouth(this.world, this.bossMouths, state.nextMouthIndex);
        if (index === null) {
          break;
        }
        this.spawnBossGhostAtMouth(kind, this.bossMouths[index]!);
        state = { ...state, nextMouthIndex: (index + 1) % this.bossMouths.length };
      }
      state = { ...state, pendingSpawns: state.pendingSpawns - 1 };
    }
    this.bossState = state;
  }

  private recordSeen(ghostKinds: readonly GhostKindId[]): void {
    this.emit({ type: "seenGhosts", ghostKinds: [...ghostKinds] });
  }

  private recordSeenUpgrades(): void {
    this.emit({ type: "seenUpgrades", ids: [...this.runUpgrades.owned] });
  }

  private effectiveUpgrades(): readonly UpgradeId[] {
    const owned = this.runUpgrades.owned;
    if (this.effectiveCache?.owned !== owned) {
      this.effectiveCache = { owned, effective: effectiveOwned(owned) };
    }
    return this.effectiveCache.effective;
  }

  private grantSpecialistLives(): void {
    specialistEnhancedBases(this.runUpgrades.owned).forEach((id) => this.payEnhanceLives(id));
  }

  private payEnhanceLives(baseId: BaseUpgradeId): void {
    if (!this.enhanceLivesPaid.has(baseId)) {
      this.enhanceLivesPaid.add(baseId);
      this.lives += enhanceGrantLives(baseId);
    }
  }

  private triggerLevelClear(): void {
    if (this.bossState !== null && !isFinalBossStage(this.bossState)) {
      this.beginBossStageTransition();
      return;
    }
    this.notePellets();
    this.recorder.levelCleared(
      this.clock.remaining,
      isBossLevel(this.levelIndex) ? 0 : timeBonusPoints(this.clock.remaining),
    );
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    this.emit({ type: "sfx", id: "levelComplete" });
    this.emitDraw();
    this.timeBonusDrain = isBossLevel(this.levelIndex)
      ? null
      : createTimeBonusDrain(this.clock.remaining);
    if (this.timeBonusDrain !== null) {
      this.emit({ type: "timeBonus", active: true });
      return;
    }
    this.finishLevelClear();
  }

  private beginBossStageTransition(): void {
    if (this.bossState === null || isFinalBossStage(this.bossState)) {
      return;
    }
    this.bossStageTransition = createBossStageTransition();
    this.bossStageDraw = { entityAlpha: 1, wallAlpha: 1 };
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    this.emit({ type: "sfx", id: "levelComplete" });
    this.emit({ type: "timer" });
    this.emitDraw();
  }

  private tickBossStageTransitionFrame(delta: number): void {
    if (this.bossStageTransition === null) {
      return;
    }
    this.clock = tickRunClock(this.clock, true, delta, this.currentTuning);
    this.emit({ type: "timer" });
    const tick = tickBossStageTransition(this.bossStageTransition, delta);
    this.bossStageTransition = tick.state;
    if (tick.cutSuccessSfx) {
      this.emit({ type: "loopStop", id: "levelComplete" });
    }
    if (tick.shouldRebuild) {
      this.refillBossStageBoard();
    }
    if (tick.startGameplayMusic) {
      this.emit({ type: "loopStart", id: "gameplayMusic" });
    }
    this.bossStageDraw = { entityAlpha: tick.entityAlpha, wallAlpha: tick.wallAlpha };
    this.emitDraw();
    if (tick.done) {
      this.bossStageTransition = null;
      this.bossStageDraw = null;
      this.emit({ type: "timer" });
      this.emitDraw();
    }
  }

  private refillBossStageBoard(): void {
    if (this.bossState === null) {
      return;
    }
    for (const eid of [...query(this.world, [Pellet])]) {
      removeEntity(this.world, eid);
      this.releaseDrawable(eid);
    }
    this.clearFruitEntities();
    this.fruitPresence = createFruitPresence();
    this.pendingPowerPelletRespawns = [];
    for (const eid of [...query(this.world, [Ghost])]) {
      removeEntity(this.world, eid);
      this.releaseDrawable(eid);
    }
    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    this.bossState = advanceBossStage(this.bossState);
    spawnBoardPellets(this.world);
    this.tagBossPellets(this.bossState);
    tagOptionalPellets(this.world, null);
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.spawnBossGhostsForLife();
    this.ghostReleaseClock = createGhostReleaseClock(this.levelIndex);
    this.ghostModeClock = createGhostModeClock(this.levelIndex, this.currentTuning);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.afterLifeRelease = false;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    this.tunnelDashAnim = null;
    this.resetHyperspeedMovement();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.resetStreak();
  }

  private tickTimeBonus(drain: TimeBonusDrain, delta: number): void {
    const tick = tickTimeBonusDrain(drain, delta);
    this.timeBonusDrain = tick.drain;
    this.clock = { ...this.clock, remaining: tick.remaining };
    this.emit({ type: "timer" });
    const charged = addBonusCharge(this.bonus, tick.points);
    this.applyBonus({ bar: charged.bar, tier: 0, filled: charged.filled });
    this.emitDraw();
    if (tick.done) {
      this.timeBonusDrain = null;
      this.emit({ type: "timeBonus", active: false });
      this.finishLevelClear();
    }
  }

  private beginLevelTransition(): void {
    this.levelTransitionRemainingMs = LEVEL_TRANSITION_MS;
    this.emitRunLog();
  }

  private finishLevelClear(): void {
    this.applyLifeRegen(this.regenAmount());
    if (this.options.disableLevelUpgrades || !offersUpgradeAfterLevel(this.levelIndex)) {
      this.beginLevelTransition();
      return;
    }
    const offer = pickUpgradeChoiceOffer(
      this.runUpgrades.owned,
      this.runUpgrades.lastDeclinedUpgradeId,
      this.random.stream("upgradeOffer", this.levelIndex),
      enhancedOfferChance(this.levelIndex),
      this.options.forceUpgrade,
    );
    this.pendingLevelClear = true;
    this.awaitingChoice = true;
    this.pendingChoice = offer;
    this.recorder.offered(offer);
    this.emit({ type: "upgradeOffer", offer });
  }

  private jumpToLevelClear(): void {
    const pelletEids = query(this.world, [Pellet, Position]);
    for (const eid of pelletEids) {
      removeEntity(this.world, eid);
      this.releaseDrawable(eid);
    }
    const collectResult = applyPelletCollect(
      this.pelletProgress,
      pelletEids.length,
      noRequiredPelletsLeft(this.world),
    );
    this.pelletProgress = collectResult.progress;
    this.lifetimeCollected += pelletEids.length;
    this.triggerLevelClear();
  }

  private resolvePowerPelletTrigger(powerRemoved: number): boolean {
    const fires = this.bankAndCountPickupFires(powerRemoved);
    return fires > 0 ? this.firePowerPelletEffects(fires) : false;
  }

  private bankAndCountPickupFires(powerRemoved: number): number {
    const overflow = shieldOverflow(this.runUpgrades, powerRemoved);
    if (shieldPelletsCap(this.effectiveUpgrades()) !== null) {
      this.bankShields(powerRemoved);
    }
    return powerPelletPickupFires(this.effectiveUpgrades(), powerRemoved, overflow);
  }

  private bankShields(count: number): void {
    const next = bankShields(this.runUpgrades, count);
    if (next !== this.runUpgrades) {
      this.runUpgrades = next;
      this.emit({ type: "shields" });
    }
  }

  private topUpStartingShields(): void {
    const next = grantStartingShields(this.runUpgrades);
    if (next !== this.runUpgrades) {
      this.runUpgrades = next;
      this.emit({ type: "shields" });
    }
  }

  private moveHyperspeed(delta: number, moveFrame: (frameDelta: number) => void): void {
    const speed = Speed.px[query(this.world, [Player, Speed])[0] ?? 0] ?? 0;
    const steps = hyperspeedSubstepCount((speed * delta) / 1000, getActiveLayout().tileSize);
    const stepDelta = delta / steps;
    let caught = false;
    for (let step = 0; step < steps; step += 1) {
      moveFrame(stepDelta);
      this.noteHyperspeedTurn();
      if (caught) {
        continue;
      }
      this.hyperspeedPellets = mergePlayerPelletFrames(
        this.hyperspeedPellets,
        collectPellets(this.world, {
          radiusBonusPx: pelletCollectRadiusBonusPx(this.effectiveUpgrades()),
          solids: getActiveLayout().playerSolids,
        }),
      );
      for (const eid of collectFruit(this.world)) {
        this.releaseDrawable(eid);
        this.hyperspeedFruitEaten += 1;
      }
      this.eatFrightenedGhosts();
      const catchOptions = this.catchOptions();
      const hit = catchPlayer(this.world, catchOptions) ?? chainCatch(this.world, catchOptions);
      if (hit !== null && !this.breakHyperspeedShield()) {
        caught = true;
        this.zeroPlayerSpeed();
      }
    }
  }

  private noteHyperspeedTurn(): void {
    const turn = noteHyperspeedFacing(
      this.hyperspeedDirection,
      playerFacing(this.world),
      this.runUpgrades.hyperspeedTurnDelayMs > 0,
    );
    this.hyperspeedDirection = turn.lastDirection;
    if (turn.turned) {
      this.runUpgrades = startHyperspeedTurnDelay(this.runUpgrades);
      this.zeroPlayerSpeed();
    }
  }

  private resetHyperspeedMovement(): void {
    this.hyperspeedDirection = null;
    this.hyperspeedPellets = emptyPlayerPelletFrame();
    this.hyperspeedFruitEaten = 0;
  }

  private zeroPlayerSpeed(): void {
    applyPlayerSpeed(this.world, 0, this.currentTuning);
  }

  private breakHyperspeedShield(): boolean {
    const spent = spendHyperspeedShield(this.runUpgrades);
    if (spent === null) {
      return false;
    }
    this.runUpgrades = spent;
    this.recorder.activation("shieldBreak");
    this.resetStreak();
    if (shieldBreakOwned(this.effectiveUpgrades())) {
      this.firePowerPelletEffects(1);
      this.runUpgrades = { ...this.runUpgrades, hyperspeedShieldRemainingMs: 0 };
    }
    return true;
  }

  private breakShield(): boolean {
    const spent = spendShield(this.runUpgrades);
    if (spent === null) {
      return false;
    }
    this.runUpgrades = spent;
    this.recorder.activation("shieldBreak");
    this.resetStreak();
    this.shieldCrack = { index: spent.shieldsBanked, elapsedMs: 0 };
    this.emit({ type: "shields" });
    this.emit({ type: "shieldCrack", index: spent.shieldsBanked, progress: 0 });
    if (shieldBreakOwned(this.effectiveUpgrades())) {
      this.firePowerPelletEffects(1);
    }
    this.runUpgrades = applyShieldBreakInvuln(this.runUpgrades);
    return true;
  }

  private tickShieldCrack(delta: number): void {
    if (this.shieldCrack === null) {
      return;
    }
    this.shieldCrack.elapsedMs += delta;
    const progress = shieldCrackProgress(this.shieldCrack.elapsedMs);
    this.emit({ type: "shieldCrack", index: this.shieldCrack.index, progress });
    if (progress >= 1) {
      this.shieldCrack = null;
    }
  }

  private fireDueEchoes(delta: number): boolean {
    if (this.runUpgrades.pendingEchoes.length === 0) {
      return false;
    }
    const echoTick = tickEchoes(this.runUpgrades.pendingEchoes, delta);
    this.runUpgrades = { ...this.runUpgrades, pendingEchoes: echoTick.pending };
    for (const bases of echoTick.ready) {
      this.recorder.activation("echo");
      if (this.firePowerPelletEffects(1, bases)) {
        return true;
      }
    }
    return false;
  }

  private firePowerPelletEffects(
    powerRemoved: number,
    echoBases?: readonly BaseUpgradeId[],
  ): boolean {
    const powerEffects = this.applyPowerEffects(powerRemoved, echoBases);
    if (powerEffects.collectExtraPellets > 0) {
      const bonusSnaps = collectExtraPellets(this.world, powerEffects.collectExtraPellets);
      for (const snap of bonusSnaps) {
        this.releasePelletSnap(snap);
      }
      if (bonusSnaps.length > 0) {
        this.emitMunch();
        const collectResult = applyPelletCollect(
          this.pelletProgress,
          bonusSnaps.length,
          noRequiredPelletsLeft(this.world),
        );
        this.pelletProgress = collectResult.progress;
        this.lifetimeCollected += bonusSnaps.length;
        if (collectResult.shouldRecordClear) {
          this.triggerLevelClear();
          return true;
        }
      }
    }
    for (let recalled = 0; recalled < powerEffects.recallGhostCount; recalled += 1) {
      this.recordRecall(
        recallClosestGhostToHouse(
          this.world,
          this.ghostReleaseClock,
          this.pelletProgress.boardCollected,
          this.afterLifeRelease,
          {
            delayAddMs: ghostHouseReleaseDelayAddMs(this.effectiveUpgrades()),
            clydePelletAdd: ghostHouseClydePelletAdd(this.effectiveUpgrades()),
          },
          frozenGhostEid(this.runUpgrades),
        ),
      );
    }
    if (powerEffects.cornerTeleportHoldMs !== null) {
      this.teleportGhostsToCorners(powerEffects.cornerTeleportHoldMs);
    }
    if (powerEffects.warpPlayerFarthest) {
      this.warpPlayer();
    }
    return false;
  }

  private spawnRespawnedPowerPellet(x: number, y: number): void {
    spawnPellet(this.world, x, y, "power");
    this.pelletProgress = addPelletsToProgress(this.pelletProgress, 1);
  }

  private regenIconFloor(): number {
    return levelLivesIconFloor(
      lifeFloorBonus(this.effectiveUpgrades()),
      this.options.maxLives ?? DEFAULT_MAX_LIVES,
    );
  }

  private regenAmount(): number {
    return levelRegenAmount(
      hasUpgrade(this.effectiveUpgrades(), "passiveMyogenesis"),
      regenToFull(this.effectiveUpgrades()),
    );
  }

  private applyLifeRegen(amount: number): void {
    const livesBefore = this.lives;
    if (amount > 0) {
      this.lives = livesAfterLevelRegen(this.lives, this.regenIconFloor(), amount);
    }
    this.recorder.livesRegenerated(livesBefore, this.lives);
    if (this.lives > livesBefore) {
      this.emit({ type: "lives", pulse: true });
    }
  }

  private applyGrantEffects(id: UpgradeId): void {
    this.lives += grantLivesForUpgrade(id);
    this.topUpStartingShields();
    if (baseIdOf(id) === "passiveMyogenesis") {
      this.lives = livesAfterLevelRegen(this.lives, this.regenIconFloor(), 1);
    }
    if (baseIdOf(id) === "passivePelletToPower") {
      this.applyPelletSurge(pelletSurgeCount([id]));
    }
    if (id === "fruitFecundity") {
      this.fruitPresence = extendFruitLifetime(this.fruitPresence, FRUIT_FECUNDITY_MUL);
    }
  }

  private applyPelletSurge(count: number, stream: RandomStream = "pelletToPower"): void {
    for (let converted = 0; converted < count; converted += 1) {
      const eid = applyPelletToPowerConvert(
        this.world,
        this.random.stream(stream, this.levelIndex),
      );
      if (eid === null) {
        return;
      }
      this.recorder.activation("pelletSurge");
      this.emitDraw();
      this.emit({ type: "bouncePowerPellet", eid });
    }
  }

  private advanceToNextLevel(): void {
    this.emit({ type: "newLevelModal" });

    this.levelIndex += 1;
    this.runUpgrades = { ...clearUpgradeTimers(this.runUpgrades), shieldsBanked: 0 };
    this.emit({ type: "shields" });
    this.eatDragMs = 0;
    this.turnTuning.reset();

    this.startBoard(null);
    this.emit({ type: "upgrades" });
    this.showLevelBanner();
    this.emit({ type: "musicAfterFanfare", id: "gameplayMusic" });
    this.emitDraw({ frozenGhostEid: null, playerInvulnRemainingMs: 0, wallPassActive: false });
  }

  private showLevelBanner(text?: string): void {
    this.emit({
      type: "banner",
      text: text ?? `LEVEL ${this.levelIndex}`,
      boss: text === undefined && isBossLevel(this.levelIndex),
    });
  }

  private handleDeathEvent(event: DeathSequenceEvent): void {
    switch (event) {
      case "resetActors":
        this.resetAfterLifeLoss();
        this.emitDraw({
          frozenGhostEid: null,
          playerInvulnRemainingMs: 0,
          wallPassActive: false,
          ...(this.reviveSplashPending ? { playerReviveProgress: 0 } : {}),
        });
        this.reviveSplashElapsedMs = this.reviveSplashPending ? 0 : null;
        this.reviveSplashPending = false;
        break;
      case "startFade":
        this.emit({ type: "deathFade" });
        break;
      case "showGameOver":
        this.emit({ type: "endText", title: "GAME OVER" });
        break;
      case "resume":
        this.death = null;
        this.finishMoneyTalks();
        if (this.reviveSplashElapsedMs !== null) {
          this.reviveSplashElapsedMs = null;
          this.emitDraw({ playerReviveProgress: 1 });
        }
        this.emit({ type: "loopStart", id: "gameplayMusic" });
        break;
      case "goToMenu":
        this.death = null;
        this.emit({ type: "goToMenu" });
        break;
    }
  }

  private tickMoneyTalks(delta: number): void {
    const spend = this.moneyTalksSpend;
    if (spend === null) {
      return;
    }
    spend.elapsedMs += delta;
    this.payMoneyTalks(moneyTalksLaunchedCount(spend.elapsedMs, spend.count) - spend.paid);
    this.emit({ type: "walletCoins", spend: { ...spend } });
  }

  private finishMoneyTalks(): void {
    const spend = this.moneyTalksSpend;
    if (spend === null) {
      return;
    }
    this.payMoneyTalks(spend.count - spend.paid);
    this.moneyTalksSpend = null;
    this.emit({ type: "walletCoins", spend: null });
  }

  private payMoneyTalks(coins: number): void {
    if (this.moneyTalksSpend === null || coins <= 0) {
      return;
    }
    this.moneyTalksSpend.paid += coins;
    this.quarters -= coins;
    this.emit({ type: "quarters", pulse: false });
  }

  private tickReviveSplash(delta: number): void {
    if (this.reviveSplashElapsedMs === null) {
      return;
    }
    this.reviveSplashElapsedMs += delta;
    const progress = reviveSplashProgress(this.reviveSplashElapsedMs);
    this.emitDraw({ playerReviveProgress: progress });
    if (progress >= 1) {
      this.reviveSplashElapsedMs = null;
    }
  }

  private beginRunComplete(): void {
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    this.emit({ type: "endText", title: "RUN COMPLETE" });
    this.runCompleteElapsedMs = 0;
    this.saveRun();
    this.recorder.finish("complete");
    this.emitRunLog();
  }

  private applyPowerEffects(powerRemoved: number, onlyBases?: readonly BaseUpgradeId[]) {
    const before = this.runUpgrades;
    const powerEffects = applyPowerPelletEffects(before, powerRemoved, onlyBases, this.levelIndex);
    this.runUpgrades = powerEffects.state;
    if (powerEffects.frightenGhosts) {
      const frightened = frightenGhosts(
        this.world,
        hunterFrightenLimit(this.bossState?.def.id ?? null),
        this.ghostsBlockedFromTunnels(),
        this.closedGatedTunnelRow(),
      );
      this.runUpgrades = { ...this.runUpgrades, frightenedGhostEids: frightened };
      if (frightened.length > 0) {
        this.recorder.activation("frighten");
      }
    }
    if (onlyBases === undefined && powerRemoved > 0) {
      this.runUpgrades = queueEcho(this.runUpgrades, this.random.stream("echo", this.levelIndex));
    }
    if (powerEffects.freezeClosestMs !== null) {
      this.runUpgrades = freezeClosestGhost(
        this.world,
        this.runUpgrades,
        powerEffects.freezeClosestMs,
      );
      this.recorder.activation("freeze");
      this.recorder.target("freeze", ghostName(this.world, frozenGhostEid(this.runUpgrades)));
    }
    const after = this.runUpgrades;
    const timers = [
      ["wallPass", before.wallPassRemainingMs, after.wallPassRemainingMs],
      ["invuln", before.invulnRemainingMs, after.invulnRemainingMs],
      ["speedBurst", before.speedBurstRemainingMs, after.speedBurstRemainingMs],
      ["hyperspeed", before.hyperspeedRemainingMs, after.hyperspeedRemainingMs],
      ["ghostHarvest", before.ghostHarvestRemainingMs, after.ghostHarvestRemainingMs],
      ["defyDeath", before.defyDeathRemainingMs, after.defyDeathRemainingMs],
    ] as const;
    for (const [kind, was, now] of timers) {
      if (now > was) {
        this.recorder.activation(kind);
      }
    }
    if (powerEffects.collectExtraPellets > 0) {
      this.recorder.activation("collectExtra");
    }
    return powerEffects;
  }

  private recordRecall(eid: number | null): void {
    if (eid !== null) {
      this.recorder.activation("recall");
      this.recorder.target("recall", ghostName(this.world, eid));
    }
  }

  private warpPlayer(): void {
    const from = this.playerPosition();
    this.warpGlide = warpPlayerFarthestFromGhosts(this.world);
    if (from !== null) {
      this.recorder.warp(from, this.playerPosition() ?? from, getActiveLayout().tileSize);
    }
  }

  private tickSpeedTrail(delta: number): void {
    const at = this.playerPosition();
    this.speedTrail =
      at !== null && (speedBurstActive(this.runUpgrades) || hyperspeedActive(this.runUpgrades))
        ? tickSpeedTrail(this.speedTrail, at, delta)
        : [];
  }

  playerWorldPosition(): Point | null {
    return this.playerPosition();
  }

  private playerPosition(): Point | null {
    const eid = query(this.world, [Player, Position])[0];
    return eid === undefined ? null : { x: Position.x[eid] ?? 0, y: Position.y[eid] ?? 0 };
  }

  private noteTunnelExit(before: Point | null): void {
    if (playerExitedTunnel(before, this.playerPosition())) {
      this.runUpgrades = applyTunnelExitInvuln(this.runUpgrades, this.effectiveUpgrades());
    }
  }

  private notePlayerMovement(
    before: Point | null,
    hasInput: boolean,
    warping: boolean,
    delta: number,
  ): void {
    const after = this.playerPosition();
    if (before === null || after === null) {
      return;
    }
    const { cols, rows, tileSize } = getActiveLayout();
    this.recorder.movement(
      before,
      after,
      { width: cols * tileSize, height: rows * tileSize, tileSize },
      hasInput,
      warping,
      delta,
    );
  }

  private notePellets(): void {
    this.recorder.pellets(
      this.pelletProgress.boardCollected,
      this.pelletProgress.pelletsRemaining,
      this.clock.remaining,
    );
  }

  private runTotals() {
    return {
      pelletsCollected: this.lifetimeCollected,
      quarters: this.quarters,
      lives: this.lives,
    };
  }

  private emitRunLog(): void {
    this.emit({ type: "runLog", record: this.recorder.snapshotRecord(this.runTotals()) });
  }

  private saveRun(): void {
    if (!this.options.highScoresDisabled) {
      this.emit({
        type: "saveRun",
        collected: this.lifetimeCollected,
        remaining: this.clock.remaining,
      });
    }
  }

  private resetAfterLifeLoss(): void {
    this.tunnelDashAnim = null;
    this.resetHyperspeedMovement();
    this.warpGlide = null;
    this.speedTrail = [];
    this.ghostCornerWarps = [];
    this.resetStreak();
    this.remoteTransferCounter = 0;
    const playerSpawn = respawnCenter(this.effectiveUpgrades(), this.fellAt);
    this.fellAt = null;
    for (const eid of query(this.world, [Player, Position, Velocity, Input, Facing])) {
      Position.x[eid] = playerSpawn.x;
      Position.y[eid] = playerSpawn.y;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      Input.direction[eid] = DIRECTION.none;
      Facing.direction[eid] = DIRECTION.none;
    }

    if (this.bossState !== null) {
      for (const eid of [...query(this.world, [Ghost])]) {
        removeEntity(this.world, eid);
        this.releaseDrawable(eid);
      }
      this.spawnBossGhostsForLife();
    }
    const toCorners =
      this.bossState === null && martyrGhostPlacement(this.effectiveUpgrades()) === "corners";
    const hauntMs = hauntDurationMs(this.effectiveUpgrades());
    const hauntEid = this.bossState === null && hauntMs !== null ? this.caughtByEid : null;
    this.caughtByEid = null;
    for (const eid of query(this.world, [
      Ghost,
      GhostPhase,
      Position,
      Velocity,
      Input,
      Facing,
      Speed,
    ])) {
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      Input.direction[eid] = DIRECTION.none;
      Facing.direction[eid] = DIRECTION.none;
      Speed.px[eid] = 0;
      if (!toCorners || eid === hauntEid || GhostPhase.value[eid] !== GHOST_PHASE.active) {
        GhostPhase.value[eid] = GHOST_PHASE.inHouse;
      }
      Ghost.decidedCol[eid] = Number.NaN;
      Ghost.decidedRow[eid] = Number.NaN;
    }

    this.ghostReleaseClock = createGhostReleaseClock(
      this.levelIndex,
      this.pelletProgress.boardCollected,
    );
    this.ghostModeClock = createGhostModeClock(this.levelIndex, this.currentTuning);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.afterLifeRelease = true;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
      { heldGhostEids: hauntEid === null ? [] : [hauntEid] },
    );
    if (toCorners && teleportGhostsToCorners(this.world, 0).length > 0) {
      this.ghostModeClock = startGhostModeClock(this.levelIndex, this.currentTuning);
      this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    }

    this.clearFruitEntities();
    this.fruitPresence = {
      ...this.fruitPresence,
      active: false,
      remainingMs: 0,
      gapMs: 0,
    };

    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    if (hauntEid !== null && hauntMs !== null) {
      this.runUpgrades = armHaunt(this.runUpgrades, hauntEid, hauntMs);
    }
    this.eatDragMs = 0;
    this.turnTuning.reset();

    this.clock = {
      ...this.clock,
      started: false,
    };
  }

  private clearFruitEntities(): void {
    for (const eid of removeAllFruit(this.world)) {
      this.releaseDrawable(eid);
    }
  }

  private spawnFruitEntity(stack: boolean): void {
    const kind = fruitSpecForLevel(this.levelIndex).kind;
    if (!stack) {
      this.clearFruitEntities();
      spawnFruit(this.world);
      this.recorder.fruitSpawned(kind);
      return;
    }
    const center = fruitStackCenter(fruitPositions(this.world));
    if (center !== null) {
      spawnFruit(this.world, center);
      this.recorder.fruitSpawned(kind);
    } else if (fruitPositions(this.world).length === 0) {
      this.fruitPresence = markFruitCollected(this.fruitPresence);
    }
  }

  private spawnBossGhostInHouse(kind: GhostKindId, releaseDelayMs: number): void {
    const eid = this.spawnBossGhost(kind);
    BossGhost.releaseDelayMs[eid] = releaseDelayMs;
  }

  private spawnBossGhostAtMouth(kind: GhostKindId, mouth: BossTunnelMouth): void {
    const eid = this.spawnBossGhost(kind);
    BossGhost.releaseDelayMs[eid] = 0;
    Position.x[eid] = cellCenterX(mouth.col);
    Position.y[eid] = cellCenterY(mouth.row);
    GhostPhase.value[eid] = GHOST_PHASE.active;
    Facing.direction[eid] = mouth.facing;
    Input.direction[eid] = mouth.facing;
  }

  private spawnBossGhost(kind: GhostKindId): number {
    const eid = this.spawnGhost(kind);
    addComponent(this.world, eid, BossGhost);
    const pair = chainPairForKind(kind);
    if (
      this.bossState?.def.chained === true &&
      pair !== null &&
      bossStage(this.bossState.def, this.bossState.stageIndex).chainPairs.includes(pair)
    ) {
      addComponent(this.world, eid, ChainedGhost);
      ChainedGhost.pair[eid] = pair;
    }
    const corners = [
      blinkyScatterTarget(),
      pinkyScatterTarget(),
      inkyScatterTarget(),
      clydeScatterTarget(),
    ];
    const scatter = this.random.stream("bossScatter", this.levelIndex);
    const corner = corners[Math.floor(scatter() * corners.length)]!;
    BossGhost.scatterCol[eid] = corner.col;
    BossGhost.scatterRow[eid] = corner.row;
    return eid;
  }

  private spawnGhost(kind: GhostKindId): number {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Velocity);
    addComponent(this.world, eid, Input);
    addComponent(this.world, eid, Facing);
    addComponent(this.world, eid, Speed);
    addComponent(this.world, eid, Ghost);
    addComponent(this.world, eid, GhostKind);
    addComponent(this.world, eid, GhostPhase);
    addComponent(this.world, eid, Drawable);

    const seats = ghostHouseSeatCenters();
    const mid = seats[Math.floor(seats.length / 2)] ?? seats[0]!;
    Position.x[eid] = mid.x;
    Position.y[eid] = mid.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Facing.direction[eid] = DIRECTION.none;
    Speed.px[eid] = 0;
    GhostKind.kind[eid] = kind;
    GhostPhase.value[eid] = GHOST_PHASE.inHouse;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    Drawable.id[eid] = GHOST_DRAWABLE_BY_KIND[kind];
    Drawable.radius[eid] = ghostRadius();
    return eid;
  }
}
