import { addComponent, addEntity, createWorld, query, removeEntity, type World } from "bitecs";
import Phaser from "phaser";
import {
  createPelletProgress,
  applyPelletCollect,
  type PelletProgress,
} from "../../domain/pelletProgress";
import {
  createFruitPresence,
  fruitSpawnCenter,
  markFruitCollected,
  tickFruitPresence,
  type FruitPresence,
} from "../../domain/fruit";
import {
  createGhostModeClock,
  resolveGhostModeStep,
  startGhostModeClock,
  type GhostAiMode,
  type GhostModeClock,
} from "../../domain/ghostMode";
import {
  createGhostReleaseClock,
  tickGhostRelease,
  type GhostReleaseClock,
} from "../../domain/ghostRelease";
import { createRunClock, tickRunClock, type RunClock } from "../../domain/runClock";
import {
  beginDeathSequence,
  DEATH_FADE_DURATION_MS,
  tickDeathSequence,
  type DeathSequenceEvent,
  type DeathSequenceState,
} from "../../domain/deathSequence";
import {
  START_LIVES,
  livesAfterLevelRegen,
  livesHudIconCount,
  livesRemainingAfterCatch,
  parseInfiniteLivesFlag,
} from "../../domain/lives";
import {
  activateAsciiLayout,
  activateLayout,
  cellCenterX,
  cellCenterY,
  getActiveLayout,
  isWalkable,
  parseMazeParam,
  pelletCellCenters,
  pelletDisplaySize,
  playerDisplaySize,
  playerSpawnCenter,
  wallCellCenters,
  type MazeLayoutId,
} from "../../domain/maze";
import {
  GENERATE_MAX_ATTEMPTS,
  generateMazeAsciiWithRetries,
  invertMazeAscii,
  resolveBoardSelection,
} from "../../domain/mazeGenerate";
import {
  ghostKindsForLevel,
  isInvertedMazeLevel,
  MAX_LEVEL,
  offersUpgradeAfterLevel,
  speedLevelMultiplier,
} from "../../domain/levelRules";
import { parseQuartersParam } from "../../domain/quartersFlag";
import { parseGhostsParam } from "../../domain/ghostsFlag";
import { parseLevelParam } from "../../domain/runLevel";
import { parseJumpToUpgradeFlag } from "../../domain/jumpToUpgradeFlag";
import {
  FRUIT_DRAWABLE_ID,
  FRUIT_RADIUS,
  GHOST_DRAWABLE_BY_KIND,
  ghostRadius,
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PLAYER_DRAWABLE_ID,
  playerRadius,
  PLAYER_SPEED,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { ghostHouseSeatCenters } from "../../domain/ghostHouseSeats";
import { GHOST_PHASE, type GhostTarget } from "../../domain/ghostTarget";
import {
  OUTLINE_TINT_BY_CORRUPTION,
  SPEED_SURGE_MUL,
  corruptionAiOption,
  createRunCorruption,
  isSpeedSurgeActive,
  maybeAssignCorruption,
  parseForceCorruptionParams,
  resetCorruptionTransient,
  tickSpeedSurge,
  type RunCorruption,
} from "../../domain/corruption";
import { addPelletsToProgress } from "../../domain/pelletProgress";
import { withSeenCorruption, withSeenGhosts, withSeenUpgrade } from "../../domain/seenRecord";
import {
  applyPowerPelletEffects,
  confirmUpgradeChoice,
  createRunUpgrades,
  declineUpgrades,
  DEATHS_HARVEST_RADIUS_TILES,
  fruitQuarterMultiplier,
  frozenGhostEid,
  ghostHouseClydePelletAdd,
  ghostHouseReleaseDelayAddMs,
  ghostSpeedMultiplier,
  grantLivesForUpgrade,
  grantUpgrade,
  parseDisableLevelUpgradesFlag,
  parseEnableUpgradeParams,
  pelletCollectRadiusBonusPx,
  pickStartingUpgrade,
  pickUpgradeChoiceOffer,
  playerIsInvulnerable,
  PLAYER_SPEED_BURST_MUL,
  playerSpeedMultiplier,
  queuePowerPelletRespawns,
  scatterBurstActive,
  speedBurstActive,
  tickFreeze,
  tickInvuln,
  tickPowerPelletRespawns,
  tickScatterBurst,
  tickSpeedBurst,
  TUNNEL_DASH_SPEED_MUL,
  tickWallPass,
  upgradeLabels,
  wallPassActive,
  type PendingPowerPelletRespawn,
  type RunUpgrades,
  type UpgradeId,
} from "../../domain/upgrades";
import { Drawable } from "../components/Drawable";
import { Facing } from "../components/Facing";
import { Fruit } from "../components/Fruit";
import { Ghost } from "../components/Ghost";
import { GhostKind } from "../components/GhostKind";
import { GhostPhase } from "../components/GhostPhase";
import { DIRECTION, Input } from "../components/Input";
import { Pellet } from "../components/Pellet";
import { Player } from "../components/Player";
import { Position } from "../components/Position";
import { PowerPellet } from "../components/PowerPellet";
import { Speed } from "../components/Speed";
import { Velocity } from "../components/Velocity";
import { Wall } from "../components/Wall";
import {
  isSfxPlaying,
  playPelletCollectSfx,
  playSfx,
  preloadSfx,
  startLoopingSfx,
  stopLoopingSfx,
} from "../audio/sfx";
import { saveRun } from "../storage/runHistoryStorage";
import { loadSeenRecord, saveSeenRecord } from "../storage/seenRecordStorage";
import { catchPlayer } from "../systems/catchPlayer";
import { collectFruit, removeAllFruit } from "../systems/collectFruit";
import { collectExtraPellets } from "../systems/collectExtraPellets";
import { collectPellets, countPellets } from "../systems/collectPellets";
import { findGhostEidByKind } from "../systems/corruptionGhost";
import { stepCorruption } from "../systems/corruptionStep";
import { harvestNearbyPellets } from "../systems/deathsHarvest";
import { ghostAi } from "../systems/ghostAi";
import { ghostExitHouse } from "../systems/ghostExitHouse";
import { recallClosestGhostToHouse } from "../systems/ghostRecall";
import { freezeClosestGhost } from "../systems/ghostFreeze";
import { ghostRelease } from "../systems/ghostRelease";
import {
  ghostHouseSeating,
  placeInHouseGhostsAtPredictedSeats,
} from "../systems/ghostHouseSeating";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { movement } from "../systems/movement";
import { slimeTrailKill } from "../systems/slimeTrailKill";
import { applyPelletToPowerConvert } from "../systems/pelletToPower";
import { hasPlayerDirectionInput } from "../systems/playerDirection";
import { createPlayerInput } from "../systems/playerInput";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import {
  applyTunnelDash,
  tickTunnelDashAnimation,
  type TunnelDashAnimation,
} from "../systems/tunnelDash";
import { snapPlayerToNearestWalkable } from "../systems/playerWallPassSnap";
import { warpPlayerToTopCenter } from "../systems/playerWarp";
import {
  createRender,
  preloadPlayArt,
  QUARTER_TEXTURE_KEY,
  PLAYER_OPEN_MOUTH_TEXTURE_KEY,
  type PlayRender,
} from "../systems/render";
import {
  addPixelText,
  HUD_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { createUpgradeChoiceModal, type UpgradeChoiceModal } from "./upgradeChoiceModal";
import { createStartingUpgradeCard, type StartingUpgradeCard } from "./startingUpgradeCard";

const LEVEL_TRANSITION_MS = 1000;
const LEVEL_BANNER_FADE_MS = 1500;
const RUN_COMPLETE_HOLD_MS = 2000;

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private runPlayerInput!: (world: World) => void;
  private anyPlayerMoveKeyDown!: () => boolean;
  private suppressPlayerInputUntilKeyRelease = false;
  private playRender!: PlayRender;
  private clock: RunClock = createRunClock();
  private ghostReleaseClock: GhostReleaseClock = createGhostReleaseClock();
  private ghostModeClock: GhostModeClock = createGhostModeClock(1);
  private previousEffectiveGhostMode: GhostAiMode = createGhostModeClock(1).mode;
  private pelletProgress: PelletProgress = createPelletProgress(0);
  private lifetimeCollected = 0;
  private quarters = 0;
  private levelIndex = 1;
  private runMazeSeed = "0";
  private secondGhostKind: GhostKindId = GHOST_KIND.pinky;
  private ghostsOverride: GhostKindId[] | null = null;
  private levelTransitionRemainingMs = 0;
  private pendingLevelClear = false;
  private runCompleteRemainingMs = 0;
  private fruitPresence: FruitPresence = createFruitPresence();
  private pendingPowerPelletRespawns: PendingPowerPelletRespawn[] = [];
  private tunnelDashAnim: TunnelDashAnimation | null = null;
  private runUpgrades: RunUpgrades = createRunUpgrades();
  private disableLevelUpgrades = false;
  private infiniteLives = false;
  private jumpToUpgrade = false;
  private runCorruption: RunCorruption = createRunCorruption({ type: null, ghostKind: null });
  private corruptionHiddenGhostEid: number | null = null;
  private corruptionFlashGhostEid: number | null = null;
  private quarterIcons: Phaser.GameObjects.Image[] = [];
  private timerText!: Phaser.GameObjects.BitmapText;
  private upgradesText!: Phaser.GameObjects.BitmapText;
  private levelBannerText: Phaser.GameObjects.BitmapText | null = null;
  private death: DeathSequenceState | null = null;
  private lives = START_LIVES;
  private afterLifeRelease = false;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private upgradeChoiceModal!: UpgradeChoiceModal;
  private startingUpgradeCard!: StartingUpgradeCard;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private sirenWasActiveBeforePause = false;
  private sirenPendingFanfareEnd = false;

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    preloadPlayArt(this);
    preloadSfx(this);
  }

  create(): void {
    this.death = null;
    this.lives = START_LIVES;
    this.afterLifeRelease = false;
    this.lifetimeCollected = 0;
    this.levelTransitionRemainingMs = 0;
    this.pendingLevelClear = false;
    this.runCompleteRemainingMs = 0;
    this.clearLevelBanner();
    this.upgradeChoiceModal?.destroy();
    this.upgradeChoiceModal = createUpgradeChoiceModal(this);
    this.startingUpgradeCard?.destroy();
    this.startingUpgradeCard = createStartingUpgradeCard(this);

    const urlParams = new URLSearchParams(location.search);
    const mazeOverride = parseMazeParam(urlParams);
    if (urlParams.has("maze") && mazeOverride === null) {
      console.warn(`Unknown ?maze= value; expected maze1|maze2|mazeSmall`);
    }
    const levelOverride = parseLevelParam(urlParams);
    if (urlParams.has("level") && levelOverride === null) {
      console.warn(`Unknown ?level= value; expected positive integer`);
    }
    const quartersOverride = parseQuartersParam(urlParams);
    if (urlParams.has("quarters") && quartersOverride === null) {
      console.warn(`Unknown ?quarters= value; expected non-negative integer`);
    }
    const forcedCorruption = parseForceCorruptionParams(urlParams);
    if (urlParams.has("forceCorruption") && forcedCorruption.type === null) {
      console.warn(
        `Unknown ?forceCorruption= value; expected slimeTrail|invisibility|freeRetargetReverse|speedSurge|wallPhaseDash|pelletDropper|falseScatter`,
      );
    }
    if (urlParams.has("forceCorruptionGhost") && forcedCorruption.ghostKind === null) {
      console.warn(`Unknown ?forceCorruptionGhost= value; expected pinky|inky|clyde`);
    }
    this.ghostsOverride = parseGhostsParam(urlParams);
    if (urlParams.has("ghosts") && this.ghostsOverride === null) {
      console.warn(`Unknown ?ghosts= value; expected comma-separated blinky|pinky|inky|clyde`);
    }
    this.jumpToUpgrade = parseJumpToUpgradeFlag(urlParams);
    this.quarters = quartersOverride ?? 0;
    this.levelIndex = levelOverride ?? (this.jumpToUpgrade ? 2 : 1);
    this.runMazeSeed = String(Math.floor(Math.random() * 0xffffffff));
    this.secondGhostKind = Math.random() < 0.5 ? GHOST_KIND.pinky : GHOST_KIND.inky;
    this.runCorruption = createRunCorruption(forcedCorruption);

    this.disableLevelUpgrades = parseDisableLevelUpgradesFlag(urlParams);
    this.infiniteLives = parseInfiniteLivesFlag(urlParams);
    this.runUpgrades = createRunUpgrades(parseEnableUpgradeParams(urlParams));
    for (const id of this.runUpgrades.owned) {
      this.lives += grantLivesForUpgrade(id);
    }
    this.recordSeenUpgrades();

    this.timerText = addPixelText(
      this,
      PLAYFIELD_WIDTH - 12,
      8,
      this.timerLabel(),
      HUD_FONT_SIZE,
    ).setDepth(10);
    placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);

    this.upgradesText = addPixelText(this, 12, PLAYFIELD_HEIGHT / 2, "", UPGRADES_HUD_FONT_SIZE)
      .setDepth(10)
      .setVisible(false);
    this.lifeIcons = [];
    this.quarterIcons = [];
    this.refreshQuartersHud();

    const playerInput = createPlayerInput(this);
    this.runPlayerInput = playerInput.apply;
    this.anyPlayerMoveKeyDown = playerInput.anyMoveKeyDown;
    this.suppressPlayerInputUntilKeyRelease = false;
    this.sirenWasActiveBeforePause = false;
    this.sirenPendingFanfareEnd = false;
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.playRender = createRender(this);

    this.startBoard(mazeOverride);

    const startingUpgrade =
      this.levelIndex === 1 && !this.jumpToUpgrade
        ? pickStartingUpgrade(this.runUpgrades.owned, () => Math.random())
        : null;
    if (startingUpgrade !== null) {
      this.runUpgrades = grantUpgrade(this.runUpgrades, startingUpgrade);
      this.applyGrantEffects(startingUpgrade);
      this.recordSeenUpgrades();
    }
    this.refreshUpgradesHud();
    this.lives = livesAfterLevelRegen(this.lives);
    this.refreshLivesIcons();
    if (startingUpgrade === null) {
      this.showLevelBanner();
      startLoopingSfx(this, "siren");
    } else {
      this.playRender.draw(this.world, {
        frozenGhostEid: null,
        playerInvulnRemainingMs: 0,
        wallPassActive: false,
        ...this.renderCorruptionOptions(),
      });
      this.startingUpgradeCard.open(startingUpgrade);
    }
    if (this.jumpToUpgrade) {
      this.jumpToLevelClear();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopLoopingSfx(this, "siren");
      stopLoopingSfx(this, "death");
      this.upgradeChoiceModal.destroy();
      this.startingUpgradeCard.destroy();
      this.clearLevelBanner();
    });
  }

  update(_time: number, delta: number): void {
    if (this.sirenPendingFanfareEnd && !isSfxPlaying(this, "levelComplete")) {
      this.sirenPendingFanfareEnd = false;
      startLoopingSfx(this, "siren");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.pauseForMenu();
      return;
    }

    if (this.startingUpgradeCard.isActive()) {
      this.startingUpgradeCard.tick(delta);
      if (this.startingUpgradeCard.isActive()) {
        return;
      }
      this.suppressPlayerInputUntilKeyRelease = true;
      startLoopingSfx(this, "siren");
    }

    if (this.death !== null) {
      const tick = tickDeathSequence(this.death, delta);
      this.death = tick.state;
      for (const event of tick.events) {
        this.handleDeathEvent(event);
      }
      return;
    }

    if (this.runCompleteRemainingMs > 0) {
      this.runCompleteRemainingMs = Math.max(0, this.runCompleteRemainingMs - delta);
      if (this.runCompleteRemainingMs === 0) {
        this.scene.start("MenuScene");
      }
      return;
    }

    if (this.levelTransitionRemainingMs > 0) {
      this.levelTransitionRemainingMs = Math.max(0, this.levelTransitionRemainingMs - delta);
      if (this.levelTransitionRemainingMs === 0) {
        if (this.levelIndex >= MAX_LEVEL) {
          this.beginRunComplete();
        } else {
          this.advanceToNextLevel();
        }
      }
      return;
    }

    if (this.upgradeChoiceModal.isActive()) {
      this.upgradeChoiceModal.tick(delta);
      if (this.upgradeChoiceModal.isActive()) {
        return;
      }
      this.suppressPlayerInputUntilKeyRelease = true;
    }

    if (this.pendingLevelClear) {
      this.pendingLevelClear = false;
      this.levelTransitionRemainingMs = LEVEL_TRANSITION_MS;
      return;
    }

    if (this.suppressPlayerInputUntilKeyRelease) {
      if (!this.anyPlayerMoveKeyDown()) {
        this.suppressPlayerInputUntilKeyRelease = false;
        this.runPlayerInput(this.world);
      }
    } else {
      this.runPlayerInput(this.world);
    }
    const hasInput = hasPlayerDirectionInput(this.world);

    this.ghostReleaseClock = tickGhostRelease(this.ghostReleaseClock, hasInput, delta);
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
    ghostRelease(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
      releaseAdds,
    );

    this.runUpgrades = tickFreeze(this.runUpgrades, delta);
    this.runUpgrades = tickScatterBurst(this.runUpgrades, delta);
    const wasWallPass = wallPassActive(this.runUpgrades);
    this.runUpgrades = tickWallPass(this.runUpgrades, delta);
    if (wasWallPass && !wallPassActive(this.runUpgrades)) {
      snapPlayerToNearestWalkable(this.world);
    }
    this.runUpgrades = tickInvuln(this.runUpgrades, delta);
    this.runUpgrades = tickSpeedBurst(this.runUpgrades, delta);
    const respawnTick = tickPowerPelletRespawns(this.pendingPowerPelletRespawns, delta);
    this.pendingPowerPelletRespawns = respawnTick.pending;
    for (const pos of respawnTick.ready) {
      this.spawnRespawnedPowerPellet(pos.x, pos.y);
    }
    this.runCorruption = tickSpeedSurge(this.runCorruption, delta);
    const levelSpeedMul = speedLevelMultiplier(this.levelIndex);
    const playerSpeedMul =
      levelSpeedMul *
      playerSpeedMultiplier(this.runUpgrades.owned) *
      (speedBurstActive(this.runUpgrades) ? PLAYER_SPEED_BURST_MUL : 1);
    applyPlayerSpeed(this.world, playerSpeedMul);
    applyGhostSpeed(this.world, this.pelletProgress.pelletsRemaining, this.levelIndex, {
      ghostSpeedMul: levelSpeedMul * ghostSpeedMultiplier(this.runUpgrades.owned),
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      speedSurge:
        this.runCorruption.ghostKind !== null && isSpeedSurgeActive(this.runCorruption)
          ? { ghostKind: this.runCorruption.ghostKind, mul: SPEED_SURGE_MUL }
          : undefined,
    });
    const playerSolidsOverride = wallPassActive(this.runUpgrades)
      ? getActiveLayout().wallPassPlayerSolids
      : undefined;
    movement(this.world, delta, playerSolidsOverride);
    if (this.tunnelDashAnim !== null) {
      this.tunnelDashAnim = tickTunnelDashAnimation(
        this.world,
        this.tunnelDashAnim,
        delta,
        PLAYER_SPEED * TUNNEL_DASH_SPEED_MUL,
      );
    } else if (this.runUpgrades.owned.includes("tunnelDash")) {
      const dash = applyTunnelDash(this.world);
      if (dash !== null) {
        if (dash.sweptPelletEids.length > 0) {
          for (const eid of dash.sweptPelletEids) {
            this.playRender.releaseDrawable(eid);
          }
          playPelletCollectSfx(
            this,
            this.lifetimeCollected,
            dash.sweptPelletEids.length,
            dash.sweptPowerRemoved,
          );
          if (this.runUpgrades.owned.includes("secondChomp")) {
            this.pendingPowerPelletRespawns = queuePowerPelletRespawns(
              this.pendingPowerPelletRespawns,
              dash.sweptPowerPositions,
            );
          }
          const collectResult = applyPelletCollect(
            this.pelletProgress,
            dash.sweptPelletEids.length,
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

    const corruptionStep = stepCorruption(
      this.world,
      this.runCorruption,
      delta,
      this.pelletProgress.pelletsRemaining,
    );
    this.runCorruption = corruptionStep.corruption;
    if (corruptionStep.dropSpawnTiles.length > 0) {
      this.spawnDroppedPellets(corruptionStep.dropSpawnTiles);
    }
    this.corruptionHiddenGhostEid = corruptionStep.hiddenGhostEid;
    this.corruptionFlashGhostEid = corruptionStep.flashGhostEid;

    if (ghostExitHouse(this.world) && !this.ghostModeClock.active) {
      this.ghostModeClock = startGhostModeClock(this.levelIndex);
    }

    this.clock = tickRunClock(this.clock, hasInput, delta);
    this.timerText.setText(this.timerLabel());
    placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);

    const {
      powerRemoved,
      removedEids: removedPelletEids,
      removedPowerPositions,
    } = collectPellets(this.world, {
      radiusBonusPx: pelletCollectRadiusBonusPx(this.runUpgrades.owned),
      solids: getActiveLayout().playerSolids,
    });
    for (const eid of removedPelletEids) {
      this.playRender.releaseDrawable(eid);
    }
    const removed = removedPelletEids.length;
    if (removed > 0) {
      playPelletCollectSfx(this, this.lifetimeCollected, removed, powerRemoved);
    }
    if (this.runUpgrades.owned.includes("secondChomp")) {
      this.pendingPowerPelletRespawns = queuePowerPelletRespawns(
        this.pendingPowerPelletRespawns,
        removedPowerPositions,
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
        this.playRender.releaseDrawable(eid);
      }
      bonusRemoved = bonusEids.length;
      if (bonusRemoved > 0) {
        playSfx(this, "pelletMunch");
        playSfx(this, "pelletMunch2");
      }
    }
    const totalRemoved = removed + bonusRemoved;
    const collectResult = applyPelletCollect(this.pelletProgress, totalRemoved);
    this.pelletProgress = collectResult.progress;
    if (totalRemoved > 0) {
      this.lifetimeCollected += totalRemoved;
    }

    const modeStep = resolveGhostModeStep(
      this.ghostModeClock,
      scatterBurstActive(this.runUpgrades),
      delta,
    );
    this.ghostModeClock = modeStep.clock;
    if (modeStep.mode !== this.previousEffectiveGhostMode) {
      forceGhostReverse(this.world, this.runCorruption);
      this.previousEffectiveGhostMode = modeStep.mode;
    } else {
      ghostAi(this.world, modeStep.mode, this.pelletProgress.pelletsRemaining, {
        ignoreElroy: scatterBurstActive(this.runUpgrades),
        corruption: corruptionAiOption(this.runCorruption),
      });
    }
    if (powerEffects.recallClosestGhost) {
      recallClosestGhostToHouse(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        releaseAdds,
      );
    }
    if (powerEffects.warpPlayerTopCenter) {
      warpPlayerToTopCenter(this.world);
    }

    const fruitTick = tickFruitPresence(
      this.fruitPresence,
      this.pelletProgress.boardCollected,
      delta,
      this.levelIndex,
    );
    if (fruitTick.action === "spawn" || fruitTick.action === "replace") {
      this.spawnFruitEntity();
    }

    const removedFruitEids = collectFruit(this.world);
    for (const eid of removedFruitEids) {
      this.playRender.releaseDrawable(eid);
    }
    if (removedFruitEids.length > 0) {
      playSfx(this, "pelletMunch");
      playSfx(this, "pelletMunch2");
      this.quarters += removedFruitEids.length * fruitQuarterMultiplier(this.runUpgrades.owned);
      this.refreshQuartersHud();
      this.fruitPresence = markFruitCollected(fruitTick.state);
      if (this.runUpgrades.owned.includes("fruitPower") && this.resolvePowerPelletTrigger(1)) {
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

    const frozenEid = frozenGhostEid(this.runUpgrades);
    const playerInvulnerable = playerIsInvulnerable(this.runUpgrades);
    const caught =
      catchPlayer(this.world, { frozenGhostEid: frozenEid, playerInvulnerable }) ||
      slimeTrailKill(this.world, this.runCorruption.trail, { playerInvulnerable });
    this.playRender.draw(this.world, {
      frozenGhostEid: frozenEid,
      playerInvulnRemainingMs: this.runUpgrades.invulnRemainingMs,
      wallPassActive: wallPassActive(this.runUpgrades),
      ...this.renderCorruptionOptions(),
    });

    if (caught) {
      if (this.runUpgrades.owned.includes("deathsHarvest")) {
        const harvested = harvestNearbyPellets(this.world, DEATHS_HARVEST_RADIUS_TILES);
        if (harvested.length > 0) {
          for (const eid of harvested) {
            this.playRender.releaseDrawable(eid);
          }
          const collectResult = applyPelletCollect(this.pelletProgress, harvested.length);
          this.pelletProgress = collectResult.progress;
          this.lifetimeCollected += harvested.length;
          if (collectResult.shouldRecordClear) {
            this.triggerLevelClear();
            return;
          }
        }
      }
      stopLoopingSfx(this, "siren");
      playSfx(this, "death");
      const result = this.infiniteLives
        ? { lives: this.lives, gameOver: false }
        : livesRemainingAfterCatch(this.lives);
      this.lives = result.lives;
      this.refreshLivesIcons();
      if (
        result.gameOver &&
        !this.infiniteLives &&
        !this.disableLevelUpgrades &&
        !this.jumpToUpgrade
      ) {
        saveRun(this.lifetimeCollected, this.clock.remaining);
      }
      this.death = beginDeathSequence(result.gameOver);
    }
  }

  private startSirenAfterFanfare(): void {
    if (isSfxPlaying(this, "levelComplete")) {
      this.sirenPendingFanfareEnd = true;
      return;
    }
    startLoopingSfx(this, "siren");
  }

  private pauseForMenu(): void {
    this.sirenWasActiveBeforePause =
      this.game.config.audio.noAudio !== true && this.sound.isPlaying("siren");
    stopLoopingSfx(this, "siren");
    this.scene.pause();
    this.scene.launch("PauseScene");
  }

  public resumeFromPauseMenu(): void {
    this.suppressPlayerInputUntilKeyRelease = true;
    if (this.upgradeChoiceModal.isActive()) {
      this.upgradeChoiceModal.rearmSelectionKeys();
    }
    if (this.sirenWasActiveBeforePause) {
      startLoopingSfx(this, "siren");
    }
    this.scene.resume();
  }

  private startBoard(layoutOverride: MazeLayoutId | null = null): void {
    this.runCorruption = maybeAssignCorruption(
      this.runCorruption,
      this.levelIndex,
      () => Math.random(),
      this.ghostsOverride ?? undefined,
    );
    const selection = resolveBoardSelection(this.levelIndex, layoutOverride, this.runMazeSeed);
    if (selection.kind === "static") {
      activateLayout(selection.id);
    } else {
      const generated = generateMazeAsciiWithRetries(selection.seed);
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
    this.playRender.resetForNewBoard();
    this.world = createWorld();
    this.spawnWalls();
    this.spawnPellets();
    this.spawnPlayer();
    const ghostKinds =
      this.ghostsOverride ?? ghostKindsForLevel(this.levelIndex, this.secondGhostKind);
    for (const kind of ghostKinds) {
      this.spawnGhost(kind);
    }
    this.recordSeen(ghostKinds);

    this.clock = createRunClock();
    this.ghostReleaseClock = createGhostReleaseClock();
    this.ghostModeClock = createGhostModeClock(this.levelIndex);
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.fruitPresence = createFruitPresence();
    this.pendingPowerPelletRespawns = [];
    this.tunnelDashAnim = null;
    this.afterLifeRelease = false;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    this.death = null;
    this.suppressPlayerInputUntilKeyRelease = false;

    this.timerText.setText(this.timerLabel());
    placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);

    if (this.runUpgrades.owned.includes("pelletToPower")) {
      this.applyPelletToPowerOnce();
    }
  }

  private recordSeen(ghostKinds: readonly GhostKindId[]): void {
    const seen = loadSeenRecord();
    const withGhosts = withSeenGhosts(seen, ghostKinds);
    const next =
      this.runCorruption.type !== null
        ? withSeenCorruption(withGhosts, this.runCorruption.type)
        : withGhosts;
    if (next !== seen) {
      saveSeenRecord(next);
    }
  }

  private recordSeenUpgrades(): void {
    const seen = loadSeenRecord();
    let next = seen;
    for (const id of this.runUpgrades.owned) {
      next = withSeenUpgrade(next, id);
    }
    if (next !== seen) {
      saveSeenRecord(next);
    }
  }

  private triggerLevelClear(): void {
    stopLoopingSfx(this, "siren");
    playSfx(this, "levelComplete");
    this.playRender.draw(this.world, {
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      playerInvulnRemainingMs: this.runUpgrades.invulnRemainingMs,
      wallPassActive: wallPassActive(this.runUpgrades),
      ...this.renderCorruptionOptions(),
    });
    if (this.disableLevelUpgrades || !offersUpgradeAfterLevel(this.levelIndex)) {
      this.levelTransitionRemainingMs = LEVEL_TRANSITION_MS;
      return;
    }
    const offer = pickUpgradeChoiceOffer(
      this.runUpgrades.owned,
      this.runUpgrades.lastDeclinedUpgradeId,
      () => Math.random(),
    );
    this.pendingLevelClear = true;
    this.upgradeChoiceModal.open(offer, (chosen) => {
      if (chosen.kind === "quarters") {
        this.quarters += chosen.amount;
        this.refreshQuartersHud();
        this.runUpgrades = declineUpgrades(this.runUpgrades, offer.upgrades);
      } else {
        const alreadyOwned = this.runUpgrades.owned.includes(chosen.id);
        this.runUpgrades = confirmUpgradeChoice(this.runUpgrades, offer.upgrades, chosen.id);
        if (!alreadyOwned) {
          this.applyGrantEffects(chosen.id);
          this.refreshLivesIcons();
          this.recordSeenUpgrades();
        }
      }
      this.refreshUpgradesHud();
    });
  }

  private jumpToLevelClear(): void {
    const pelletEids = query(this.world, [Pellet, Position]);
    for (const eid of pelletEids) {
      removeEntity(this.world, eid);
      this.playRender.releaseDrawable(eid);
    }
    const collectResult = applyPelletCollect(this.pelletProgress, pelletEids.length);
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
        ? getActiveLayout().wallPassPlayerSolids
        : getActiveLayout().playerSolids;
      const bonusEids = collectExtraPellets(this.world, powerEffects.collectExtraPellets, solids);
      for (const eid of bonusEids) {
        this.playRender.releaseDrawable(eid);
      }
      if (bonusEids.length > 0) {
        playSfx(this, "pelletMunch");
        playSfx(this, "pelletMunch2");
        const collectResult = applyPelletCollect(this.pelletProgress, bonusEids.length);
        this.pelletProgress = collectResult.progress;
        this.lifetimeCollected += bonusEids.length;
        if (collectResult.shouldRecordClear) {
          this.triggerLevelClear();
          return true;
        }
      }
    }
    if (powerEffects.recallClosestGhost) {
      recallClosestGhostToHouse(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
        {
          delayAddMs: ghostHouseReleaseDelayAddMs(this.runUpgrades.owned),
          clydePelletAdd: ghostHouseClydePelletAdd(this.runUpgrades.owned),
        },
      );
    }
    if (powerEffects.warpPlayerTopCenter) {
      warpPlayerToTopCenter(this.world);
    }
    return false;
  }

  private spawnRespawnedPowerPellet(x: number, y: number): void {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Pellet);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Drawable);
    addComponent(this.world, eid, PowerPellet);
    Position.x[eid] = x;
    Position.y[eid] = y;
    Drawable.id[eid] = POWER_PELLET_DRAWABLE_ID;
    Drawable.radius[eid] = PELLET_RADIUS;
    this.pelletProgress = addPelletsToProgress(this.pelletProgress, 1);
  }

  private applyGrantEffects(id: UpgradeId): void {
    this.lives += grantLivesForUpgrade(id);
    if (id === "pelletToPower") {
      this.applyPelletToPowerOnce();
    }
  }

  private applyPelletToPowerOnce(): void {
    const eid = applyPelletToPowerConvert(this.world, () => Math.random());
    if (eid === null) {
      return;
    }
    this.playRender.draw(this.world, {
      frozenGhostEid: frozenGhostEid(this.runUpgrades),
      playerInvulnRemainingMs: this.runUpgrades.invulnRemainingMs,
      wallPassActive: wallPassActive(this.runUpgrades),
      ...this.renderCorruptionOptions(),
    });
    this.playRender.bouncePowerPellet(eid);
  }

  private renderCorruptionOptions(): {
    corruptedGhostEid: number | null;
    corruptedTint: number | undefined;
    flashGhostEid: number | null;
    hiddenGhostEid: number | null;
    slimeTrailTiles: GhostTarget[];
  } {
    const corruptedGhostEid = findGhostEidByKind(this.world, this.runCorruption.ghostKind);
    const corruptedTint =
      this.runCorruption.type !== null
        ? OUTLINE_TINT_BY_CORRUPTION[this.runCorruption.type]
        : undefined;
    return {
      corruptedGhostEid,
      corruptedTint,
      flashGhostEid: this.corruptionFlashGhostEid,
      hiddenGhostEid: this.corruptionHiddenGhostEid,
      slimeTrailTiles: this.runCorruption.trail,
    };
  }

  private spawnDroppedPellets(tiles: readonly GhostTarget[]): void {
    let spawned = 0;
    const { playerSolids } = getActiveLayout();
    for (const tile of tiles) {
      if (!isWalkable(tile.col, tile.row, playerSolids)) {
        continue;
      }
      const x = cellCenterX(tile.col);
      const y = cellCenterY(tile.row);
      const occupied = query(this.world, [Pellet, Position]).some(
        (eid) => Position.x[eid] === x && Position.y[eid] === y,
      );
      if (occupied) {
        continue;
      }

      const eid = addEntity(this.world);
      addComponent(this.world, eid, Pellet);
      addComponent(this.world, eid, Position);
      addComponent(this.world, eid, Drawable);
      Position.x[eid] = x;
      Position.y[eid] = y;
      Drawable.id[eid] = PELLET_DRAWABLE_ID;
      Drawable.radius[eid] = PELLET_RADIUS;
      spawned += 1;
    }

    if (spawned > 0) {
      this.pelletProgress = addPelletsToProgress(this.pelletProgress, spawned);
    }
  }

  private advanceToNextLevel(): void {
    this.upgradeChoiceModal.destroy();
    this.upgradeChoiceModal = createUpgradeChoiceModal(this);

    this.levelIndex += 1;
    this.runUpgrades = {
      ...this.runUpgrades,
      freezeRemainingMs: 0,
      frozenGhostEid: null,
      scatterBurstRemainingMs: 0,
      wallPassRemainingMs: 0,
      invulnRemainingMs: 0,
      speedBurstRemainingMs: 0,
    };
    this.runCorruption = resetCorruptionTransient(this.runCorruption);
    this.corruptionHiddenGhostEid = null;
    this.corruptionFlashGhostEid = null;

    this.startBoard(null);
    this.refreshUpgradesHud();
    const livesBeforeRegen = this.lives;
    this.lives = livesAfterLevelRegen(this.lives);
    this.refreshLivesIcons(this.lives > livesBeforeRegen);
    this.showLevelBanner();
    this.startSirenAfterFanfare();
    this.playRender.draw(this.world, {
      frozenGhostEid: null,
      playerInvulnRemainingMs: 0,
      wallPassActive: false,
      ...this.renderCorruptionOptions(),
    });
  }

  private showLevelBanner(): void {
    this.clearLevelBanner();
    const banner = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      `LEVEL ${this.levelIndex}`,
      MENU_TITLE_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    ).setDepth(800);
    placePixelText(banner, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, 0.5, 0.5);
    this.levelBannerText = banner;
    this.tweens.add({
      targets: banner,
      alpha: 0,
      duration: LEVEL_BANNER_FADE_MS,
      onComplete: () => {
        if (this.levelBannerText === banner) {
          this.clearLevelBanner();
        }
      },
    });
  }

  private clearLevelBanner(): void {
    this.levelBannerText?.destroy();
    this.levelBannerText = null;
  }

  private handleDeathEvent(event: DeathSequenceEvent): void {
    switch (event) {
      case "resetActors":
        this.resetAfterLifeLoss();
        this.playRender.draw(this.world, {
          frozenGhostEid: null,
          playerInvulnRemainingMs: 0,
          wallPassActive: false,
          ...this.renderCorruptionOptions(),
        });
        break;
      case "startFade":
        this.startDeathFadeOverlay();
        break;
      case "showGameOver":
        this.showGameOverText();
        break;
      case "resume":
        this.death = null;
        startLoopingSfx(this, "siren");
        break;
      case "goToMenu":
        this.death = null;
        this.scene.start("MenuScene");
        break;
    }
  }

  private startDeathFadeOverlay(): void {
    const overlay = this.add
      .rectangle(
        PLAYFIELD_WIDTH / 2,
        PLAYFIELD_HEIGHT / 2,
        PLAYFIELD_WIDTH,
        PLAYFIELD_HEIGHT,
        0x000000,
      )
      .setDepth(1000)
      .setAlpha(0);
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: DEATH_FADE_DURATION_MS,
    });
  }

  private beginRunComplete(): void {
    stopLoopingSfx(this, "siren");
    this.showCenteredEndText("RUN COMPLETE");
    this.runCompleteRemainingMs = RUN_COMPLETE_HOLD_MS;
  }

  private showGameOverText(): void {
    this.showCenteredEndText("GAME OVER");
  }

  private showCenteredEndText(title: string): void {
    const titleText = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2 - 20,
      title,
      MENU_TITLE_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    ).setDepth(1001);
    placePixelText(titleText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2 - 20, 0.5, 0.5);

    const collected = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2 + 24,
      this.collectedLabel(),
      HUD_FONT_SIZE,
    ).setDepth(1001);
    placePixelText(collected, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2 + 24, 0.5, 0.5);
  }

  private resetAfterLifeLoss(): void {
    this.tunnelDashAnim = null;
    const playerSpawn = playerSpawnCenter();
    for (const eid of query(this.world, [Player, Position, Velocity, Input, Facing])) {
      Position.x[eid] = playerSpawn.x;
      Position.y[eid] = playerSpawn.y;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      Input.direction[eid] = DIRECTION.none;
      Facing.direction[eid] = DIRECTION.none;
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

    this.ghostReleaseClock = createGhostReleaseClock();
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
    };

    this.runUpgrades = {
      ...this.runUpgrades,
      freezeRemainingMs: 0,
      frozenGhostEid: null,
      scatterBurstRemainingMs: 0,
      wallPassRemainingMs: 0,
      invulnRemainingMs: 0,
      speedBurstRemainingMs: 0,
    };
    this.runCorruption = resetCorruptionTransient(this.runCorruption);
    this.corruptionHiddenGhostEid = null;
    this.corruptionFlashGhostEid = null;

    this.clock = {
      ...this.clock,
      started: false,
    };
  }

  private refreshLivesIcons(pulseNewIcon = false): void {
    for (const icon of this.lifeIcons) {
      icon.destroy();
    }
    this.lifeIcons = [];
    const size = playerDisplaySize();
    const y = PLAYFIELD_HEIGHT - 8 - size / 2;
    for (let i = 0; i < livesHudIconCount(this.lives); i += 1) {
      const x = 12 + size / 2 + i * (size + 4);
      const icon = this.add
        .image(x, y, PLAYER_OPEN_MOUTH_TEXTURE_KEY)
        .setDisplaySize(size, size)
        .setDepth(10);
      this.lifeIcons.push(icon);
    }
    if (pulseNewIcon && this.lifeIcons.length > 0) {
      this.pulseLifeIcon(this.lifeIcons[this.lifeIcons.length - 1]);
    }
  }

  private pulseLifeIcon(icon: Phaser.GameObjects.Image): void {
    const baseScale = icon.scaleX;
    this.tweens.add({
      targets: icon,
      scale: baseScale * 1.4,
      duration: 160,
      ease: "Sine.easeOut",
      yoyo: true,
    });
  }

  private refreshQuartersHud(): void {
    for (const icon of this.quarterIcons) {
      icon.destroy();
    }
    this.quarterIcons = [];
    const size = pelletDisplaySize();
    const y = 8 + size / 2;
    for (let i = 0; i < this.quarters; i += 1) {
      const x = 12 + size / 2 + i * (size + 4);
      const icon = this.add
        .image(x, y, QUARTER_TEXTURE_KEY)
        .setDisplaySize(size, size)
        .setDepth(10);
      this.quarterIcons.push(icon);
    }
  }

  private refreshUpgradesHud(): void {
    const labels = upgradeLabels(this.runUpgrades.owned);
    if (labels.length === 0) {
      this.upgradesText.setVisible(false);
      return;
    }
    this.upgradesText.setVisible(true);
    this.upgradesText.setText(labels.join("\n"));
    placePixelText(this.upgradesText, 12, PLAYFIELD_HEIGHT / 2, 0, 0.5);
  }

  private collectedLabel(): string {
    return `Collected: ${this.lifetimeCollected}`;
  }

  private timerLabel(): string {
    return `Time: ${this.clock.remaining}`;
  }

  private clearFruitEntities(): void {
    for (const eid of removeAllFruit(this.world)) {
      this.playRender.releaseDrawable(eid);
    }
  }

  private spawnFruitEntity(): void {
    this.clearFruitEntities();
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Fruit);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Drawable);
    const spawn = fruitSpawnCenter();
    Position.x[eid] = spawn.x;
    Position.y[eid] = spawn.y;
    Drawable.id[eid] = FRUIT_DRAWABLE_ID;
    Drawable.radius[eid] = FRUIT_RADIUS;
  }

  private spawnWalls(): void {
    for (const cell of wallCellCenters()) {
      const eid = addEntity(this.world);
      addComponent(this.world, eid, Wall);
      addComponent(this.world, eid, Position);
      Position.x[eid] = cell.x;
      Position.y[eid] = cell.y;
    }
  }

  private spawnPellets(): void {
    for (const cell of pelletCellCenters()) {
      const eid = addEntity(this.world);
      addComponent(this.world, eid, Pellet);
      addComponent(this.world, eid, Position);
      addComponent(this.world, eid, Drawable);
      if (cell.kind === "power") {
        addComponent(this.world, eid, PowerPellet);
      }
      Position.x[eid] = cell.x;
      Position.y[eid] = cell.y;
      Drawable.id[eid] = cell.kind === "power" ? POWER_PELLET_DRAWABLE_ID : PELLET_DRAWABLE_ID;
      Drawable.radius[eid] = PELLET_RADIUS;
    }
  }

  private spawnPlayer(): void {
    const eid = addEntity(this.world);
    addComponent(this.world, eid, Position);
    addComponent(this.world, eid, Velocity);
    addComponent(this.world, eid, Input);
    addComponent(this.world, eid, Facing);
    addComponent(this.world, eid, Speed);
    addComponent(this.world, eid, Player);
    addComponent(this.world, eid, Drawable);

    const spawn = playerSpawnCenter();
    Position.x[eid] = spawn.x;
    Position.y[eid] = spawn.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Facing.direction[eid] = DIRECTION.none;
    Speed.px[eid] = PLAYER_SPEED;
    Drawable.id[eid] = PLAYER_DRAWABLE_ID;
    Drawable.radius[eid] = playerRadius();
  }

  private spawnGhost(kind: GhostKindId): void {
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
  }
}
