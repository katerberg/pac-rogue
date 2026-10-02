import type { RandomStream } from "../../domain/runRandom";
import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
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
  tickTimeBonusDrain,
  type TimeBonusDrain,
} from "../../domain/timeBonus";
import {
  bossTunnelMouths,
  pickBossPelletCells,
  type BossTunnelMouth,
} from "../../domain/bossBoard";
import {
  bossForLevel,
  createBossState,
  recordBossPelletsEaten,
  splitBossGhosts,
  type BossDef,
  type BossState,
} from "../../domain/bossRules";
import {
  beginDeathSequence,
  tickDeathSequence,
  type DeathSequenceEvent,
  type DeathSequenceState,
} from "../../domain/deathSequence";
import { reviveSplashProgress } from "../../domain/reviveSplash";
import {
  createFruitPresence,
  extendFruitLifetime,
  fruitStackCenter,
  markFruitCollected,
  tickFruitPresence,
  type FruitPresence,
} from "../../domain/fruit";
import { ghostHouseSeatCenters } from "../../domain/ghostHouseSeats";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
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
  ghostKindsForLevel,
  isInvertedMazeLevel,
  MAX_LEVEL,
  offersUpgradeAfterLevel,
  speedLevelMultiplier,
} from "../../domain/levelRules";
import {
  START_LIVES,
  levelLivesIconFloor,
  levelRegenAmount,
  livesAfterLevelRegen,
  livesRemainingAfterCatch,
} from "../../domain/lives";
import {
  activateAsciiLayout,
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  horizontalTunnelRows,
  playerSpawnCenter,
  worldToCol,
  worldToRow,
  type MazeLayoutId,
} from "../../domain/maze";
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
  PLAYER_SPEED,
} from "../../domain/playfield";
import { createRunClock, tickRunClock, type RunClock } from "../../domain/runClock";
import { createRunRandom, type RunRandom } from "../../domain/runRandom";
import {
  storeLevelFor,
  STORE_FIRST_LEVEL,
  STORE_EXIT_SLIDE_TILES,
  createStoreState,
  parseStoreSlots,
  pickMidStoreLevel,
  promptView,
  storeAfterLevel,
  storeExitAlpha,
  storeExitDirection,
  storeStep,
  type StoreExitDirection,
  type StorePurchase,
  type StoreState,
} from "../../domain/store";
import {
  TUNNEL_DASH_SPEED_MUL,
  applyPowerPelletEffects,
  clearUpgradeTimers,
  defyDeathActive,
  confirmUpgradeChoice,
  createRunUpgrades,
  declineUpgrades,
  FRUIT_FECUNDITY_MUL,
  fruitLifetimeMultiplier,
  fruitQuartersPerFruit,
  deathsHarvestRadiusTiles,
  speedBurstMultiplier,
  turnBoostMs,
  turnPerfectPx,
  secondChompMs,
  lifeFloorBonus,
  hasUpgrade,
  enhanceGrantLives,
  enhanceUpgrade,
  enhancedIdOf,
  wallPassLoopOwned,
  fruitFeastThresholds,
  fruitPowerConvertsPellet,
  fruitPersistsUntilLevelEnd,
  fruitStacksSideBySide,
  ghostTunnelSpeedRatio,
  baseIdOf,
  pelletSurgeCount,
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
  type UpgradeId,
  remoteTransferEvery,
} from "../../domain/upgrades";
import { remoteTransferTriggers } from "../../domain/pelletCollectExtra";
import { BossGhost } from "../components/BossGhost";
import { BossPellet } from "../components/BossPellet";
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
import { bossGhostBlock, countBossPellets, pickFreeBossMouth } from "../systems/bossGhosts";
import { catchPlayer } from "../systems/catchPlayer";
import { collectExtraPellets } from "../systems/collectExtraPellets";
import { applyRemoteTransference } from "../systems/remoteTransference";
import { wallPassSolids } from "../systems/wallPassSolids";
import { collectFruit, fruitPositions, removeAllFruit } from "../systems/collectFruit";
import { collectPellets, countPellets, onlyPowerPelletsLeft } from "../systems/collectPellets";
import { harvestNearbyPellets } from "../systems/deathsHarvest";
import { ghostAi } from "../systems/ghostAi";
import { ghostExitHouse } from "../systems/ghostExitHouse";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { harvestPelletsByGhosts } from "../systems/ghostHarvest";
import {
  ghostHouseSeating,
  placeInHouseGhostsAtPredictedSeats,
} from "../systems/ghostHouseSeating";
import { recallClosestGhostToHouse } from "../systems/ghostRecall";
import { ghostRelease } from "../systems/ghostRelease";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import {
  CARDINAL_STEP,
  KEY_FOR_DIRECTION,
  NO_KEYS_HELD,
  anyKeyHeld,
  applyHeldKeys,
  freshKeys,
  isPerpendicularTurn,
  type HeldKeys,
  type TurnTap,
} from "../systems/heldKeys";
import {
  PERFECT_SPARK_COUNT,
  TURN_FLASH_MS,
  isCleanTap,
  closeSparkCount,
  turnFeedback,
  type TurnFeedbackKind,
  tickTurnTimer,
  turnBoostMultiplier,
} from "../../domain/turnTuning";
import { movement } from "../systems/movement";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { pelletAtCell } from "../systems/pelletAtCell";
import { playerCell } from "../systems/playerCell";
import {
  clearPlayerDirectionInput,
  hasPlayerDirectionInput,
  playerFacing,
  playerPose,
} from "../systems/playerDirection";
import { slidePlayer } from "../systems/playerSlide";
import { eatDragAfterCollect, eatDragMultiplier, tickEatDrag } from "../../domain/eatDrag";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import {
  tickWarpGlide,
  type WarpGlide,
  warpGlideRemainingMs,
  warpGlideSprites,
} from "../../domain/warpGlide";
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
import {
  applyTunnelDash,
  tickTunnelDashAnimation,
  type TunnelDashAnimation,
} from "../systems/tunnelDash";
import { nameOf, worldSnapshot } from "../systems/worldSnapshot";
import type { SimEvent, SimRenderOptions } from "./simEvents";
import { spawnBoardPellets, spawnFruit, spawnPellet, spawnPlayer, spawnWalls } from "./spawn";
import type { SimInput } from "./simInput";

export const LEVEL_TRANSITION_MS = 1000;
export const RUN_COMPLETE_HOLD_MS = 2000;

export type PlayHud = {
  time: number;
  timerVisible: boolean;
  lives: number;
  quarters: number;
  bonusCharge: number;
  upgrades: readonly UpgradeId[];
  collected: number;
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
  private quarters = 0;
  private bonus: BonusBar;
  private lastPlayerCell: Cell | null = null;
  private timeBonusDrain: TimeBonusDrain | null = null;
  private levelIndex = 1;
  private secondGhostKind: GhostKindId = GHOST_KIND.pinky;
  private bossState: BossState | null = null;
  private bossMouths: BossTunnelMouth[] = [];
  private levelTransitionRemainingMs = 0;
  private pendingLevelClear = false;
  private runCompleteRemainingMs = 0;
  private fruitPresence: FruitPresence = createFruitPresence();
  private pendingPowerPelletRespawns: PendingPowerPelletRespawn[] = [];
  private tunnelDashAnim: TunnelDashAnimation | null = null;
  private warpGlide: WarpGlide | null = null;
  private ghostCornerWarps: GhostCornerWarp[] = [];
  private runUpgrades: RunUpgrades = createRunUpgrades();
  private midStoreLevel = 5;
  private store: StoreState | null = null;
  private storeExitSlide: (StoreExitDirection & { traveledPx: number }) | null = null;
  private timerVisible = true;
  private death: DeathSequenceState | null = null;
  private reviveSplashPending = false;
  private reviveSplashElapsedMs: number | null = null;
  private lives = START_LIVES;
  private afterLifeRelease = false;
  private eatDragMs = 0;
  private turnBoostMs = 0;
  private turnFlashMs = 0;
  private turnPerfectPending = false;
  private simClockMs = 0;
  private lastKeyPressMs: Partial<Record<keyof HeldKeys, number>> = {};
  private prevKeys: HeldKeys = NO_KEYS_HELD;

  constructor(options: PlayOptions, seed: string) {
    this.options = options;
    this.random = createRunRandom(seed);
    this.quarters = options.quarters ?? 0;
    this.bonus = createBonusBar(options.bonus ?? 0);
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
    }
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
      this.runUpgrades = grantUpgrade(this.runUpgrades, startingUpgrade);
      this.applyGrantEffects(startingUpgrade);
      this.recordSeenUpgrades();
    }
    this.emit({ type: "upgrades" });
    this.lives = livesAfterLevelRegen(this.lives, this.regenIconFloor(), this.regenAmount());
    this.emit({ type: "lives", pulse: false });
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
    } else if (options.store !== null) {
      this.enterStore();
    }
    return this.takeEvents();
  }

  step(input: SimInput, delta: number): SimEvent[] {
    this.events = [];
    this.tick(input, delta);
    this.prevKeys = input.keys;
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
      this.emit({ type: "quarters" });
      this.runUpgrades = declineUpgrades(this.runUpgrades, offer.upgrades);
    } else {
      const alreadyOwned = hasUpgrade(this.runUpgrades.owned, chosen.id);
      this.runUpgrades = confirmUpgradeChoice(this.runUpgrades, offer.upgrades, chosen.id);
      if (!alreadyOwned) {
        this.applyGrantEffects(chosen.id);
        this.emit({ type: "lives", pulse: false });
        this.recordSeenUpgrades();
      }
    }
    this.emit({ type: "upgrades" });
    return this.takeEvents();
  }

  suppressInputUntilRelease(): void {
    this.suppressInputUntilKeyRelease = true;
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

  hud(): PlayHud {
    return {
      time: this.clock.remaining,
      timerVisible: this.timerVisible,
      lives: this.lives,
      quarters: this.quarters,
      bonusCharge: this.bonus.charge,
      upgrades: this.runUpgrades.owned,
      collected: this.lifetimeCollected,
    };
  }

  renderOptions(): SimRenderOptions {
    return {
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      playerInvulnRemainingMs: playerTintRemainingMs(this.runUpgrades),
      wallPassActive: wallPassActive(this.runUpgrades),
      wallPassLoopActive:
        wallPassActive(this.runUpgrades) && wallPassLoopOwned(this.runUpgrades.owned),
      turnFlashRemainingMs: this.turnFlashMs,
      ghostHarvestActive: ghostHarvestActive(this.runUpgrades),
      playerWarpGlide: this.warpGlide === null ? undefined : warpGlideSprites(this.warpGlide),
      ghostWarpGlides: ghostWarpGlideSprites(this.ghostCornerWarps),
    };
  }

  snapshot() {
    const upgrades = this.runUpgrades;
    return {
      seed: this.random.seed,
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
      boardCollected: this.pelletProgress.boardCollected,
      pelletsRemaining: this.pelletProgress.pelletsRemaining,
      ghostMode: nameOf(GHOST_AI_MODE, this.ghostModeClock.mode),
      upgrades: upgrades.owned,
      timers: {
        freezeMs: upgrades.freezeRemainingMs,
        wallPassMs: upgrades.wallPassRemainingMs,
        invulnMs: upgrades.invulnRemainingMs,
        speedBurstMs: upgrades.speedBurstRemainingMs,
        ghostHarvestMs: upgrades.ghostHarvestRemainingMs,
        defyDeathMs: upgrades.defyDeathRemainingMs,
        eatDragMs: this.eatDragMs,
        turnBoostMs: this.turnBoostMs,
        turnFlashMs: this.turnFlashMs,
        warpGlideMs: warpGlideRemainingMs(this.warpGlide),
        ghostWarpGlideMs: ghostWarpGlideRemainingMs(this.ghostCornerWarps),
      },
      inputSuppressed: this.suppressInputUntilKeyRelease,
      dying: this.death !== null,
      reviveProgress:
        this.reviveSplashElapsedMs === null
          ? null
          : reviveSplashProgress(this.reviveSplashElapsedMs),
      levelTransition: this.levelTransitionRemainingMs > 0,
      highScoresDisabled: this.options.highScoresDisabled,
      inStore: this.store !== null,
      storeStock:
        this.store?.slots
          .filter((slot) => !slot.sold)
          .map((slot) =>
            slot.kind === "upgrade"
              ? slot.id
              : slot.kind === "swap"
                ? `swap:${slot.outgoingId}`
                : slot.kind === "enhance"
                  ? `enhance:${slot.targetId}`
                  : "life",
          ) ?? null,
      boss: this.bossState === null ? null : { ghostCount: this.bossState.ghostCount },
      ...worldSnapshot(this.world),
    };
  }

  private resetTurnTuning(): void {
    this.turnBoostMs = 0;
    this.turnFlashMs = 0;
    this.turnPerfectPending = false;
  }

  private noteTurnKeys(keys: HeldKeys, tap: TurnTap | null): void {
    if (tap !== null) {
      const lastPress = this.lastKeyPressMs[KEY_FOR_DIRECTION[tap.direction]!];
      const perfectPx = turnPerfectPx(this.runUpgrades.owned);
      const feedback = turnFeedback(tap.aheadPx, isCleanTap(lastPress, this.simClockMs), perfectPx);
      this.turnPerfectPending = feedback === "perfect";
      if (feedback === "close") {
        this.emitTurnSparks("close", closeSparkCount(tap.aheadPx, perfectPx));
      }
    }
    for (const key of freshKeys(this.prevKeys, keys)) {
      this.lastKeyPressMs[key] = this.simClockMs;
    }
  }

  private emitTurnSparks(kind: TurnFeedbackKind, count: number): void {
    const pose = playerPose(this.world);
    if (pose === null) {
      return;
    }
    const step = CARDINAL_STEP[pose.facing] ?? { dx: 0, dy: 0 };
    this.emit({ type: "turnSparks", kind, x: pose.x, y: pose.y, dx: step.dx, dy: step.dy, count });
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
    this.ghostCornerWarps = mergeGhostCornerWarps(
      this.ghostCornerWarps,
      teleportGhostsToCorners(this.world, holdMs),
    );
  }

  private emitDraw(overrides: Partial<SimRenderOptions> = {}): void {
    this.emit({ type: "draw", options: { ...this.renderOptions(), ...overrides } });
  }

  private releaseDrawable(eid: number): void {
    this.emit({ type: "releaseDrawable", eid });
  }

  private tick(input: SimInput, delta: number): void {
    if (this.warpGlide !== null) {
      this.warpGlide = tickWarpGlide(this.warpGlide, delta);
    }
    this.ghostCornerWarps = tickGhostCornerWarps(this.ghostCornerWarps, delta);
    if (this.awaitingStartingCard) {
      if (input.uiOpen) {
        return;
      }
      this.awaitingStartingCard = false;
      this.suppressInputUntilKeyRelease = true;
    }

    if (this.death !== null) {
      const tick = tickDeathSequence(this.death, delta);
      this.death = tick.state;
      for (const event of tick.events) {
        this.handleDeathEvent(event);
      }
      this.tickReviveSplash(delta);
      return;
    }

    if (this.runCompleteRemainingMs > 0) {
      this.runCompleteRemainingMs = Math.max(0, this.runCompleteRemainingMs - delta);
      if (this.runCompleteRemainingMs === 0) {
        this.emit({ type: "goToMenu" });
      }
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

    const diagonalAllowed = wallPassActive(this.runUpgrades);
    const turnTuning =
      !diagonalAllowed && hasUpgrade(this.runUpgrades.owned, "passiveTurnTuning")
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
      turnTap = applyHeldKeys(this.world, input.keys, { diagonalAllowed, turnTuning });
    }
    this.simClockMs += delta;
    if (turnTuning) {
      this.noteTurnKeys(input.keys, turnTap);
    }
    const hasInput = hasPlayerDirectionInput(this.world);

    this.ghostReleaseClock = tickGhostRelease(
      this.ghostReleaseClock,
      hasInput,
      delta,
      this.pelletProgress.boardCollected,
    );
    const releaseAdds = {
      delayAddMs: ghostHouseReleaseDelayAddMs(this.runUpgrades.owned),
      clydePelletAdd: ghostHouseClydePelletAdd(this.runUpgrades.owned),
    };
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
    this.runUpgrades = tickGhostHarvest(this.runUpgrades, delta);
    this.runUpgrades = tickDefyDeath(this.runUpgrades, delta);
    const respawnTick = tickPowerPelletRespawns(this.pendingPowerPelletRespawns, delta);
    this.pendingPowerPelletRespawns = respawnTick.pending;
    for (const pos of respawnTick.ready) {
      this.spawnRespawnedPowerPellet(pos.x, pos.y);
    }
    this.eatDragMs = tickEatDrag(this.eatDragMs, delta);
    this.turnBoostMs = tickTurnTimer(this.turnBoostMs, delta);
    this.turnFlashMs = tickTurnTimer(this.turnFlashMs, delta);
    const levelSpeedMul = speedLevelMultiplier(this.levelIndex);
    const playerSpeedMul =
      levelSpeedMul *
      playerSpeedMultiplier(this.runUpgrades.owned) *
      (speedBurstActive(this.runUpgrades) ? speedBurstMultiplier(this.runUpgrades.owned) : 1) *
      eatDragMultiplier(this.eatDragMs) *
      turnBoostMultiplier(this.turnBoostMs, turnBoostMs(this.runUpgrades.owned)) *
      (warping ? 0 : 1);
    applyPlayerSpeed(this.world, playerSpeedMul);
    applyGhostSpeed(this.world, this.pelletProgress.pelletsRemaining, this.levelIndex, {
      ghostSpeedMul:
        (this.bossState === null ? levelSpeedMul : 1) *
        ghostSpeedMultiplier(this.runUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      heldGhostEids: heldGhostEids(this.ghostCornerWarps),
      tunnelSpeedRatio: ghostTunnelSpeedRatio(this.runUpgrades.owned),
    });
    const playerSolidsOverride = wallPassActive(this.runUpgrades)
      ? wallPassSolids(this.runUpgrades.owned)
      : undefined;
    if (this.bossState !== null) {
      bossGhostBlock(this.world);
    }
    const facingBeforeMove = playerFacing(this.world);
    movement(this.world, delta, playerSolidsOverride);
    if (isPerpendicularTurn(facingBeforeMove, playerFacing(this.world))) {
      if (this.turnPerfectPending) {
        this.turnBoostMs = turnBoostMs(this.runUpgrades.owned);
        this.turnFlashMs = TURN_FLASH_MS;
        this.emitTurnSparks("perfect", PERFECT_SPARK_COUNT);
      }
      this.turnPerfectPending = false;
    }
    if (this.tunnelDashAnim !== null) {
      this.tunnelDashAnim = tickTunnelDashAnimation(
        this.world,
        this.tunnelDashAnim,
        delta,
        PLAYER_SPEED * TUNNEL_DASH_SPEED_MUL,
      );
    } else if (hasUpgrade(this.runUpgrades.owned, "passiveTunnelDash")) {
      const dash = applyTunnelDash(this.world);
      if (dash !== null) {
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
          if (hasUpgrade(this.runUpgrades.owned, "passivePowerPelletRecharge")) {
            this.pendingPowerPelletRespawns = queuePowerPelletRespawns(
              this.pendingPowerPelletRespawns,
              dash.sweptPowerPositions,
              secondChompMs(this.runUpgrades.owned),
            );
          }
          this.applyBonus(applyStreakPellets(this.bonus, dash.sweptCells));
          const collectResult = applyPelletCollect(
            this.pelletProgress,
            dash.sweptPelletEids.length,
            onlyPowerPelletsLeft(this.world),
          );
          this.pelletProgress = collectResult.progress;
          this.lifetimeCollected += dash.sweptPelletEids.length;
          if (
            dash.sweptPowerRemoved > 0 &&
            this.resolvePowerPelletTrigger(dash.sweptPowerRemoved)
          ) {
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
      this.ghostModeClock = startGhostModeClock(this.levelIndex);
    }

    this.clock = tickRunClock(this.clock, hasInput, delta);
    this.emit({ type: "timer" });

    const playerFrame = collectPellets(this.world, {
      radiusBonusPx: pelletCollectRadiusBonusPx(this.runUpgrades.owned),
      solids: getActiveLayout().playerSolids,
    });
    const ghostFrame = ghostHarvestActive(this.runUpgrades)
      ? harvestPelletsByGhosts(this.world)
      : { powerRemoved: 0, removedEids: [], removedPowerPositions: [] };
    const powerRemoved = playerFrame.powerRemoved + ghostFrame.powerRemoved;
    const removedPelletEids = [...playerFrame.removedEids, ...ghostFrame.removedEids];
    const removedPowerPositions = [
      ...playerFrame.removedPowerPositions,
      ...ghostFrame.removedPowerPositions,
    ];
    for (const eid of removedPelletEids) {
      this.releaseDrawable(eid);
    }
    if (playerFrame.removedCells.length > 0) {
      this.applyBonus(applyStreakPellets(this.bonus, playerFrame.removedCells));
    } else {
      this.bonus = tickStreakIdle(this.bonus, delta);
    }
    const removed = removedPelletEids.length;
    this.eatDragMs = eatDragAfterCollect(this.eatDragMs, removed - powerRemoved, powerRemoved);
    if (removed > 0) {
      this.emit({
        type: "pelletSfx",
        previousCollected: this.lifetimeCollected,
        removed,
        powerRemoved,
      });
    }
    if (hasUpgrade(this.runUpgrades.owned, "passivePowerPelletRecharge")) {
      this.pendingPowerPelletRespawns = queuePowerPelletRespawns(
        this.pendingPowerPelletRespawns,
        removedPowerPositions,
        secondChompMs(this.runUpgrades.owned),
      );
    }
    const powerEffects = applyPowerPelletEffects(this.runUpgrades, powerRemoved);
    this.runUpgrades = powerEffects.state;
    if (powerEffects.freezeClosestMs !== null) {
      this.runUpgrades = freezeClosestGhost(
        this.world,
        this.runUpgrades,
        powerEffects.freezeClosestMs,
      );
    }
    let bonusRemoved = 0;
    if (powerEffects.collectExtraPellets > 0) {
      const bonusEids = collectExtraPellets(
        this.world,
        powerEffects.collectExtraPellets,
        playerSolidsOverride ?? getActiveLayout().playerSolids,
      );
      for (const eid of bonusEids) {
        this.releaseDrawable(eid);
      }
      bonusRemoved = bonusEids.length;
      if (bonusRemoved > 0) {
        this.emitMunch();
      }
    }
    const transferred = this.applyRemoteTransferStep(removed + bonusRemoved);
    const totalRemoved = removed + bonusRemoved + transferred;
    const collectResult = applyPelletCollect(
      this.pelletProgress,
      totalRemoved,
      onlyPowerPelletsLeft(this.world),
    );
    this.pelletProgress = collectResult.progress;
    if (totalRemoved > 0) {
      this.lifetimeCollected += totalRemoved;
    }

    const modeStep = resolveGhostModeStep(this.ghostModeClock, delta);
    this.ghostModeClock = modeStep.clock;
    if (modeStep.mode !== this.previousEffectiveGhostMode) {
      forceGhostReverse(this.world);
      this.previousEffectiveGhostMode = modeStep.mode;
    } else {
      ghostAi(this.world, modeStep.mode, this.pelletProgress.pelletsRemaining);
    }
    for (let recalled = 0; recalled < powerEffects.recallGhostCount; recalled += 1) {
      recallClosestGhostToHouse(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        releaseAdds,
        frozenGhostEid(this.runUpgrades),
      );
    }
    if (powerEffects.cornerTeleportHoldMs !== null) {
      this.teleportGhostsToCorners(powerEffects.cornerTeleportHoldMs);
    }
    if (powerEffects.warpPlayerFarthest) {
      this.warpGlide = warpPlayerFarthestFromGhosts(this.world);
    }

    const stacksFruit = fruitStacksSideBySide(this.runUpgrades.owned);
    const fruitTick = tickFruitPresence(
      this.fruitPresence,
      this.pelletProgress.boardCollected,
      delta,
      this.levelIndex,
      {
        feastBase: fruitFeastThresholds(this.runUpgrades.owned),
        lifetimeMul: fruitLifetimeMultiplier(this.runUpgrades.owned),
        persist: fruitPersistsUntilLevelEnd(this.runUpgrades.owned),
        stack: stacksFruit,
      },
    );
    if (fruitTick.action === "spawn" || fruitTick.action === "replace") {
      this.spawnFruitEntity(stacksFruit);
    }

    const removedFruitEids = collectFruit(this.world);
    for (const eid of removedFruitEids) {
      this.releaseDrawable(eid);
    }
    if (removedFruitEids.length > 0) {
      this.emitMunch();
      const fruitQuarters = fruitQuartersPerFruit(this.runUpgrades.owned);
      if (fruitQuarters !== null) {
        this.quarters += removedFruitEids.length * fruitQuarters;
        this.emit({ type: "quarters" });
      } else {
        const fruitCharge = addBonusCharge(
          this.bonus,
          removedFruitEids.length * FRUIT_BONUS_CHARGE,
        );
        this.applyBonus({ bar: fruitCharge.bar, tier: 0, filled: fruitCharge.filled });
      }
      this.fruitPresence = markFruitCollected(
        fruitTick.state,
        fruitPositions(this.world).length > 0,
      );
      if (fruitPowerConvertsPellet(this.runUpgrades.owned)) {
        this.applyPelletSurge(1, "fruitPowerConvert");
      }
      if (
        hasUpgrade(this.runUpgrades.owned, "fruitPowerPellet") &&
        this.resolvePowerPelletTrigger(1)
      ) {
        return;
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

    const frozenEid = frozenGhostEid(this.runUpgrades);
    const playerInvulnerable = this.options.godMode || playerIsInvulnerable(this.runUpgrades);
    const caught = catchPlayer(this.world, {
      frozenGhostEid: frozenEid,
      skipGhostEids: glidingGhostEids(this.ghostCornerWarps),
      playerInvulnerable,
    });
    this.emitDraw();

    if (caught) {
      if (hasUpgrade(this.runUpgrades.owned, "passiveDeathsHarvest")) {
        const harvested = harvestNearbyPellets(
          this.world,
          deathsHarvestRadiusTiles(this.runUpgrades.owned),
        );
        if (harvested.length > 0) {
          for (const eid of harvested) {
            this.releaseDrawable(eid);
          }
          const harvestResult = applyPelletCollect(
            this.pelletProgress,
            harvested.length,
            onlyPowerPelletsLeft(this.world),
          );
          this.pelletProgress = harvestResult.progress;
          this.lifetimeCollected += harvested.length;
          if (harvestResult.shouldRecordClear) {
            this.triggerLevelClear();
            return;
          }
        }
      }
      this.emit({ type: "loopStop", id: "gameplayMusic" });
      const defied = defyDeathActive(this.runUpgrades);
      this.reviveSplashPending = defied;
      this.emit({ type: "sfx", id: defied ? "revive" : "death" });
      const result =
        this.options.infiniteLives || defied
          ? { lives: this.lives, gameOver: false }
          : livesRemainingAfterCatch(this.lives);
      this.lives = result.lives;
      this.emit({ type: "lives", pulse: false });
      if (result.gameOver && !this.options.highScoresDisabled) {
        this.emit({
          type: "saveRun",
          collected: this.lifetimeCollected,
          remaining: this.clock.remaining,
        });
      }
      this.death = beginDeathSequence(result.gameOver);
    }
  }

  private checkStreakCell(): void {
    const cell = playerCell(this.world);
    const last = this.lastPlayerCell;
    if (cell !== null && last !== null && (cell.col !== last.col || cell.row !== last.row)) {
      this.bonus = enterCell(this.bonus, cell, pelletAtCell(this.world, cell));
    }
    this.lastPlayerCell = cell;
  }

  private applyBonus(result: BonusResult): void {
    this.bonus = result.bar;
    if (result.filled > 0) {
      this.quarters += result.filled;
      this.emit({ type: "quarters" });
    }
    if (result.tier > 0 || result.filled > 0) {
      this.emit({ type: "bonus", tier: result.tier, filled: result.filled });
    }
  }

  private resetStreak(): void {
    this.bonus = breakStreak(this.bonus);
    this.lastPlayerCell = null;
  }

  private applyRemoteTransferStep(removedThisFrame: number): number {
    const every = remoteTransferEvery(this.runUpgrades.owned);
    if (every === null) {
      return 0;
    }
    const before = this.remoteTransferCounter;
    this.remoteTransferCounter += removedThisFrame;
    const triggers = remoteTransferTriggers(before, this.remoteTransferCounter, every);
    const eids = applyRemoteTransference(this.world, triggers);
    for (const eid of eids) {
      this.releaseDrawable(eid);
    }
    if (eids.length > 0) {
      this.emit({
        type: "pelletSfx",
        previousCollected: this.lifetimeCollected + removedThisFrame,
        removed: eids.length,
        powerRemoved: 0,
      });
      this.remoteTransferCounter += eids.length;
    }
    return eids.length;
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
    this.resetTurnTuning();
    this.pendingPowerPelletRespawns = [];
    this.tunnelDashAnim = null;
    this.warpGlide = null;
    this.ghostCornerWarps = [];
    this.resetStreak();
    this.emit({ type: "resetBoard" });
    this.world = createWorld();
    spawnWalls(this.world);
    spawnPlayer(this.world);

    this.store = createStoreState(
      parseStoreSlots(STORE_MAZE_ASCII),
      this.runUpgrades.owned,
      this.random.stream("storeStock", this.levelIndex),
      this.levelIndex === STORE_FIRST_LEVEL,
    );
    this.emit({ type: "storeOpened" });
    this.timerVisible = false;
    this.emit({ type: "timerVisible", visible: false });
    this.suppressInputUntilKeyRelease = true;
    this.showLevelBanner("STORE");
    this.emit({ type: "musicAfterFanfare", id: "storeMusic" });
    this.drawStore();
  }

  private tickStore(input: SimInput, delta: number): void {
    if (this.storeExitSlide !== null) {
      this.tickStoreExitSlide(delta);
      return;
    }
    const confirming = this.storeConfirmOpen();
    if (confirming) {
      clearPlayerDirectionInput(this.world);
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
      speedLevelMultiplier(this.levelIndex) * playerSpeedMultiplier(this.runUpgrades.owned),
    );
    movement(this.world, delta, undefined, true);

    const cell = playerCell(this.world);
    const layout = getActiveLayout();
    const exit = cell && storeExitDirection(cell.col, cell.row, layout.cols, layout.rows);
    if (exit) {
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
    this.quarters -= purchase.price;
    this.emit({ type: "quarters" });
    this.emitMunch();
    if (purchase.kind === "life") {
      this.lives += 1;
      this.emit({ type: "lives", pulse: true });
      return;
    }
    let id: UpgradeId;
    if (purchase.kind === "enhance") {
      id = enhancedIdOf(purchase.targetId);
      this.runUpgrades = enhanceUpgrade(this.runUpgrades, purchase.targetId);
      this.lives += enhanceGrantLives(purchase.targetId);
    } else {
      if (purchase.kind === "swap") {
        this.runUpgrades = revokeUpgrade(this.runUpgrades, purchase.outgoingId);
      }
      id = purchase.kind === "swap" ? purchase.incomingId : purchase.id;
      this.runUpgrades = grantUpgrade(this.runUpgrades, id);
      this.applyGrantEffects(id);
    }
    this.emit({ type: "lives", pulse: grantLivesForUpgrade(id) > 0 });
    this.recordSeenUpgrades();
    this.emit({ type: "upgrades" });
    this.emit({ type: "storePurchased", id });
  }

  private exitStore(): void {
    this.closeStore();
    if (this.levelIndex >= MAX_LEVEL) {
      this.beginRunComplete();
    } else {
      this.timerVisible = true;
      this.emit({ type: "timerVisible", visible: true });
      this.advanceToNextLevel();
    }
  }

  private closeStore(): void {
    this.storeExitSlide = null;
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
    const boss = bossForLevel(this.levelIndex);
    const selection = resolveBoardSelection(this.levelIndex, layoutOverride, this.random.seed);
    if (selection.kind === "static") {
      activateLayout(selection.id);
    } else {
      const generated = this.generateBoard(selection.seed, boss);
      if (generated) {
        try {
          const ascii = isInvertedMazeLevel(this.levelIndex)
            ? invertMazeAscii(generated.ascii)
            : generated.ascii;
          activateAsciiLayout(ascii);
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
      this.recordSeen([boss.ghostKind]);
    } else {
      const ghostKinds =
        this.options.ghosts ?? ghostKindsForLevel(this.levelIndex, this.secondGhostKind);
      for (const kind of ghostKinds) {
        this.spawnGhost(kind);
      }
      this.recordSeen(ghostKinds);
    }

    this.clock = createRunClock();
    this.ghostReleaseClock = createGhostReleaseClock(this.levelIndex);
    this.ghostModeClock = createGhostModeClock(this.levelIndex);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.remoteTransferCounter = 0;
    this.fruitPresence = createFruitPresence();
    this.pendingPowerPelletRespawns = [];
    this.tunnelDashAnim = null;
    this.warpGlide = null;
    this.ghostCornerWarps = [];
    this.afterLifeRelease = false;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    this.death = null;
    this.suppressInputUntilKeyRelease = false;
    this.emit({ type: "timer" });

    this.applyPelletSurge(pelletSurgeCount(this.runUpgrades.owned));
    if (this.bossState !== null) {
      this.tagBossPellets(this.bossState);
    }
  }

  private generateBoard(
    seed: string,
    boss: BossDef | null,
  ): ReturnType<typeof generateMazeAsciiWithRetries> {
    if (boss === null) {
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
    this.bossState = createBossState(boss, this.options.bossGhosts ?? boss.startGhosts);
    this.spawnBossGhostsForLife();
  }

  private spawnBossGhostsForLife(): void {
    if (this.bossState === null) {
      return;
    }
    const { def, ghostCount } = this.bossState;
    const { house, tunnel } = splitBossGhosts(def, ghostCount);
    for (let i = 0; i < house; i += 1) {
      this.spawnBossGhostInHouse(BLINKY_RELEASE_DELAY_MS + i * def.houseReleaseStaggerMs);
    }
    this.bossState = { ...this.bossState, pendingSpawns: tunnel };
  }

  private tagBossPellets(state: BossState): void {
    const regular = [...query(this.world, [Pellet, Position])].filter(
      (eid) => Drawable.id[eid] === PELLET_DRAWABLE_ID,
    );
    const cells = regular.map((eid) => ({
      eid,
      col: worldToCol(Position.x[eid] ?? 0),
      row: worldToRow(Position.y[eid] ?? 0),
    }));
    const picks = pickBossPelletCells(cells, getActiveLayout().playerSpawn, state.def.spawnPellets);
    if (picks.length < state.def.spawnPellets) {
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
      if (this.bossMouths.length === 0) {
        this.spawnBossGhostInHouse(0);
      } else {
        const index = pickFreeBossMouth(this.world, this.bossMouths, state.nextMouthIndex);
        if (index === null) {
          break;
        }
        this.spawnBossGhostAtMouth(this.bossMouths[index]!);
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

  private triggerLevelClear(): void {
    this.emit({ type: "loopStop", id: "gameplayMusic" });
    this.emit({ type: "sfx", id: "levelComplete" });
    this.emitDraw();
    this.timeBonusDrain =
      bossForLevel(this.levelIndex) === null ? createTimeBonusDrain(this.clock.remaining) : null;
    if (this.timeBonusDrain !== null) {
      this.emit({ type: "timeBonus", active: true });
      return;
    }
    this.finishLevelClear();
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
    const livesBeforeRegen = this.lives;
    this.lives = livesAfterLevelRegen(this.lives, this.regenIconFloor(), this.regenAmount());
    this.emit({ type: "lives", pulse: this.lives > livesBeforeRegen });
    this.levelTransitionRemainingMs = LEVEL_TRANSITION_MS;
  }

  private finishLevelClear(): void {
    if (this.options.disableLevelUpgrades || !offersUpgradeAfterLevel(this.levelIndex)) {
      this.beginLevelTransition();
      return;
    }
    const offer = pickUpgradeChoiceOffer(
      this.runUpgrades.owned,
      this.runUpgrades.lastDeclinedUpgradeId,
      this.random.stream("upgradeOffer", this.levelIndex),
    );
    this.pendingLevelClear = true;
    this.awaitingChoice = true;
    this.pendingChoice = offer;
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
      onlyPowerPelletsLeft(this.world),
    );
    this.pelletProgress = collectResult.progress;
    this.lifetimeCollected += pelletEids.length;
    this.triggerLevelClear();
  }

  private resolvePowerPelletTrigger(powerRemoved: number): boolean {
    const powerEffects = applyPowerPelletEffects(this.runUpgrades, powerRemoved);
    this.runUpgrades = powerEffects.state;
    if (powerEffects.freezeClosestMs !== null) {
      this.runUpgrades = freezeClosestGhost(
        this.world,
        this.runUpgrades,
        powerEffects.freezeClosestMs,
      );
    }
    if (powerEffects.collectExtraPellets > 0) {
      const solids = wallPassActive(this.runUpgrades)
        ? wallPassSolids(this.runUpgrades.owned)
        : getActiveLayout().playerSolids;
      const bonusEids = collectExtraPellets(this.world, powerEffects.collectExtraPellets, solids);
      for (const eid of bonusEids) {
        this.releaseDrawable(eid);
      }
      if (bonusEids.length > 0) {
        this.emitMunch();
        const collectResult = applyPelletCollect(
          this.pelletProgress,
          bonusEids.length,
          onlyPowerPelletsLeft(this.world),
        );
        this.pelletProgress = collectResult.progress;
        this.lifetimeCollected += bonusEids.length;
        if (collectResult.shouldRecordClear) {
          this.triggerLevelClear();
          return true;
        }
      }
    }
    for (let recalled = 0; recalled < powerEffects.recallGhostCount; recalled += 1) {
      recallClosestGhostToHouse(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        {
          delayAddMs: ghostHouseReleaseDelayAddMs(this.runUpgrades.owned),
          clydePelletAdd: ghostHouseClydePelletAdd(this.runUpgrades.owned),
        },
        frozenGhostEid(this.runUpgrades),
      );
    }
    if (powerEffects.cornerTeleportHoldMs !== null) {
      this.teleportGhostsToCorners(powerEffects.cornerTeleportHoldMs);
    }
    if (powerEffects.warpPlayerFarthest) {
      this.warpGlide = warpPlayerFarthestFromGhosts(this.world);
    }
    return false;
  }

  private spawnRespawnedPowerPellet(x: number, y: number): void {
    spawnPellet(this.world, x, y, "power");
    this.pelletProgress = addPelletsToProgress(this.pelletProgress, 1);
  }

  private regenIconFloor(): number {
    return levelLivesIconFloor(lifeFloorBonus(this.runUpgrades.owned));
  }

  private regenAmount(): number {
    return levelRegenAmount(
      hasUpgrade(this.runUpgrades.owned, "passiveMyogenesis"),
      regenToFull(this.runUpgrades.owned),
    );
  }

  private applyGrantEffects(id: UpgradeId): void {
    this.lives += grantLivesForUpgrade(id);
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
      this.emitDraw();
      this.emit({ type: "bouncePowerPellet", eid });
    }
  }

  private advanceToNextLevel(): void {
    this.emit({ type: "newLevelModal" });

    this.levelIndex += 1;
    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    this.eatDragMs = 0;
    this.resetTurnTuning();

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
      boss: text === undefined && bossForLevel(this.levelIndex) !== null,
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
    this.runCompleteRemainingMs = RUN_COMPLETE_HOLD_MS;
  }

  private resetAfterLifeLoss(): void {
    this.tunnelDashAnim = null;
    this.warpGlide = null;
    this.ghostCornerWarps = [];
    this.resetStreak();
    this.remoteTransferCounter = 0;
    const playerSpawn = playerSpawnCenter();
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
      GhostPhase.value[eid] = GHOST_PHASE.inHouse;
      Ghost.decidedCol[eid] = Number.NaN;
      Ghost.decidedRow[eid] = Number.NaN;
    }

    this.ghostReleaseClock = createGhostReleaseClock(
      this.levelIndex,
      this.pelletProgress.boardCollected,
    );
    this.ghostModeClock = createGhostModeClock(this.levelIndex);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.afterLifeRelease = true;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );

    this.clearFruitEntities();
    this.fruitPresence = {
      ...this.fruitPresence,
      active: false,
      remainingMs: 0,
      gapMs: 0,
    };

    this.runUpgrades = clearUpgradeTimers(this.runUpgrades);
    this.eatDragMs = 0;
    this.resetTurnTuning();

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
    if (!stack) {
      this.clearFruitEntities();
      spawnFruit(this.world);
      return;
    }
    const center = fruitStackCenter(fruitPositions(this.world));
    if (center !== null) {
      spawnFruit(this.world, center);
    } else if (fruitPositions(this.world).length === 0) {
      this.fruitPresence = markFruitCollected(this.fruitPresence);
    }
  }

  private spawnBossGhostInHouse(releaseDelayMs: number): void {
    const eid = this.spawnBossGhost();
    BossGhost.releaseDelayMs[eid] = releaseDelayMs;
  }

  private spawnBossGhostAtMouth(mouth: BossTunnelMouth): void {
    const eid = this.spawnBossGhost();
    BossGhost.releaseDelayMs[eid] = 0;
    Position.x[eid] = cellCenterX(mouth.col);
    Position.y[eid] = cellCenterY(mouth.row);
    GhostPhase.value[eid] = GHOST_PHASE.active;
    Facing.direction[eid] = mouth.facing;
    Input.direction[eid] = mouth.facing;
  }

  private spawnBossGhost(): number {
    const kind = this.bossState?.def.ghostKind ?? GHOST_KIND.blinky;
    const eid = this.spawnGhost(kind);
    addComponent(this.world, eid, BossGhost);
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
