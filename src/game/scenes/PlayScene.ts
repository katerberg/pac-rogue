import { addComponent, addEntity, createWorld, query, type World } from "bitecs";
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
import { START_LIVES, livesIconCount, livesRemainingAfterCatch } from "../../domain/lives";
import {
  activateLayout,
  parseMazeParam,
  pelletCellCenters,
  pickLayoutId,
  playerDisplaySize,
  playerSpawnCenter,
  wallCellCenters,
  type MazeLayoutId,
} from "../../domain/maze";
import { ghostKindsForLevel, ghostSpeedLevelMul, parseLevelParam } from "../../domain/runLevel";
import {
  BLINKY_DRAWABLE_ID,
  CLYDE_DRAWABLE_ID,
  FRUIT_DRAWABLE_ID,
  FRUIT_RADIUS,
  GHOST_RADIUS,
  INKY_DRAWABLE_ID,
  PELLET_DRAWABLE_ID,
  PELLET_RADIUS,
  PINKY_DRAWABLE_ID,
  PLAYER_DRAWABLE_ID,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYFIELD_HEIGHT,
  PLAYFIELD_WIDTH,
  POWER_PELLET_DRAWABLE_ID,
} from "../../domain/playfield";
import { GHOST_KIND, type GhostKindId } from "../../domain/ghostKind";
import { ghostHouseSeatCenters } from "../../domain/ghostHouseSeats";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import {
  applyPowerPelletEffects,
  confirmUpgradeChoice,
  createRunUpgrades,
  ghostsAreFrozen,
  ghostSpeedMultiplier,
  grantLivesForUpgrade,
  parseEnableUpgradeParams,
  parseUpgradeId,
  pickUpgradeChoiceOffer,
  playerSpeedMultiplier,
  scatterBurstActive,
  tickFreeze,
  tickScatterBurst,
  upgradeLabels,
  type RunUpgrades,
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
  playPelletCollectSfx,
  playSfx,
  preloadSfx,
  startLoopingSfx,
  stopLoopingSfx,
} from "../audio/sfx";
import { saveRun } from "../storage/runHistoryStorage";
import { catchPlayer } from "../systems/catchPlayer";
import { collectFruit, removeAllFruit } from "../systems/collectFruit";
import { collectPellets, countPellets } from "../systems/collectPellets";
import { ghostAi } from "../systems/ghostAi";
import { ghostExitHouse } from "../systems/ghostExitHouse";
import { recallClosestGhostToHouse } from "../systems/ghostRecall";
import { ghostRelease } from "../systems/ghostRelease";
import {
  ghostHouseSeating,
  placeInHouseGhostsAtPredictedSeats,
} from "../systems/ghostHouseSeating";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { movement } from "../systems/movement";
import { hasPlayerDirectionInput } from "../systems/playerDirection";
import { createPlayerInput } from "../systems/playerInput";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { warpPlayerToTopCenter } from "../systems/playerWarp";
import {
  createRender,
  preloadPlayArt,
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
import {
  createUpgradeChoiceModal,
  UPGRADE_RESUME_COUNTDOWN_MS,
  type UpgradeChoiceModal,
} from "./upgradeChoiceModal";

const LEVEL_TRANSITION_MS = 1000;
const LEVEL_BANNER_FADE_MS = 1500;

const GHOST_DRAWABLE_BY_KIND: Record<GhostKindId, string> = {
  [GHOST_KIND.blinky]: BLINKY_DRAWABLE_ID,
  [GHOST_KIND.pinky]: PINKY_DRAWABLE_ID,
  [GHOST_KIND.inky]: INKY_DRAWABLE_ID,
  [GHOST_KIND.clyde]: CLYDE_DRAWABLE_ID,
};

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private runPlayerInput!: (world: World) => void;
  private anyPlayerMoveKeyDown!: () => boolean;
  private suppressPlayerInputUntilKeyRelease = false;
  private playRender!: PlayRender;
  private clock: RunClock = createRunClock();
  private ghostReleaseClock: GhostReleaseClock = createGhostReleaseClock();
  private ghostModeClock: GhostModeClock = createGhostModeClock();
  private previousEffectiveGhostMode: GhostAiMode = createGhostModeClock().mode;
  private pelletProgress: PelletProgress = createPelletProgress(0);
  private lifetimeCollected = 0;
  private levelIndex = 1;
  private levelTransitionRemainingMs = 0;
  private fruitPresence: FruitPresence = createFruitPresence();
  private runUpgrades: RunUpgrades = createRunUpgrades();
  private collectedText!: Phaser.GameObjects.BitmapText;
  private timerText!: Phaser.GameObjects.BitmapText;
  private upgradesText!: Phaser.GameObjects.BitmapText;
  private levelBannerText: Phaser.GameObjects.BitmapText | null = null;
  private death: DeathSequenceState | null = null;
  private lives = START_LIVES;
  private afterLifeRelease = false;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private upgradeChoiceModal!: UpgradeChoiceModal;
  private resumeCountdownRemainingMs = 0;
  private resumeCountdownDim: Phaser.GameObjects.Rectangle | null = null;
  private resumeCountdownText: Phaser.GameObjects.BitmapText | null = null;

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
    this.clearUpgradeResumeCountdown();
    this.clearLevelBanner();
    this.upgradeChoiceModal?.destroy();
    this.upgradeChoiceModal = createUpgradeChoiceModal(this);

    const urlParams = new URLSearchParams(location.search);
    const mazeOverride = parseMazeParam(urlParams);
    if (urlParams.has("maze") && mazeOverride === null) {
      console.warn(`Unknown ?maze= value; expected maze1|maze2`);
    }
    const levelOverride = parseLevelParam(urlParams);
    if (urlParams.has("level") && levelOverride === null) {
      console.warn(`Unknown ?level= value; expected positive integer`);
    }
    this.levelIndex = levelOverride ?? 1;

    this.runUpgrades = createRunUpgrades(
      parseUpgradeId(urlParams.get("forceUpgrade")),
      parseEnableUpgradeParams(urlParams),
    );
    for (const id of this.runUpgrades.owned) {
      this.lives += grantLivesForUpgrade(id);
    }

    this.collectedText = addPixelText(this, 12, 8, this.collectedLabel(), HUD_FONT_SIZE).setDepth(
      10,
    );
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

    const playerInput = createPlayerInput(this);
    this.runPlayerInput = playerInput.apply;
    this.anyPlayerMoveKeyDown = playerInput.anyMoveKeyDown;
    this.suppressPlayerInputUntilKeyRelease = false;
    this.playRender = createRender(this);

    this.startBoard(mazeOverride);
    this.refreshUpgradesHud();
    this.refreshLivesIcons();
    this.showLevelBanner();

    startLoopingSfx(this, "siren");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopLoopingSfx(this, "siren");
      stopLoopingSfx(this, "death");
      this.upgradeChoiceModal.destroy();
      this.clearUpgradeResumeCountdown();
      this.clearLevelBanner();
    });
  }

  update(_time: number, delta: number): void {
    if (this.death !== null) {
      const tick = tickDeathSequence(this.death, delta);
      this.death = tick.state;
      for (const event of tick.events) {
        this.handleDeathEvent(event);
      }
      return;
    }

    if (this.levelTransitionRemainingMs > 0) {
      this.levelTransitionRemainingMs = Math.max(0, this.levelTransitionRemainingMs - delta);
      if (this.levelTransitionRemainingMs === 0) {
        this.advanceToNextLevel();
      }
      return;
    }

    if (this.upgradeChoiceModal.isActive()) {
      this.upgradeChoiceModal.tick(delta);
      if (this.upgradeChoiceModal.isActive()) {
        return;
      }
    }

    if (this.resumeCountdownRemainingMs > 0) {
      this.resumeCountdownRemainingMs = Math.max(0, this.resumeCountdownRemainingMs - delta);
      this.refreshUpgradeResumeCountdownText();
      if (this.resumeCountdownRemainingMs === 0) {
        this.clearUpgradeResumeCountdown();
        this.suppressPlayerInputUntilKeyRelease = true;
      } else {
        const ghostsFrozen = ghostsAreFrozen(this.runUpgrades);
        this.playRender.draw(this.world, { ghostsFrozen });
        return;
      }
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
    ghostHouseSeating(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    ghostRelease(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );

    this.runUpgrades = tickFreeze(this.runUpgrades, delta);
    this.runUpgrades = tickScatterBurst(this.runUpgrades, delta);
    const frozen = ghostsAreFrozen(this.runUpgrades);
    applyPlayerSpeed(this.world, playerSpeedMultiplier(this.runUpgrades.owned));
    applyGhostSpeed(this.world, this.pelletProgress.pelletsRemaining, {
      ghostSpeedMul:
        ghostSpeedLevelMul(this.levelIndex) * ghostSpeedMultiplier(this.runUpgrades.owned),
      frozen,
    });
    movement(this.world, delta);

    if (ghostExitHouse(this.world) && !this.ghostModeClock.active) {
      this.ghostModeClock = startGhostModeClock();
    }

    this.clock = tickRunClock(this.clock, hasInput, delta);
    this.timerText.setText(this.timerLabel());
    placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);

    const { powerRemoved, removedEids: removedPelletEids } = collectPellets(this.world);
    for (const eid of removedPelletEids) {
      this.playRender.releaseDrawable(eid);
    }
    const removed = removedPelletEids.length;
    if (removed > 0) {
      playPelletCollectSfx(this, this.lifetimeCollected, removed, powerRemoved);
    }
    const powerEffects = applyPowerPelletEffects(this.runUpgrades, powerRemoved);
    this.runUpgrades = powerEffects.state;
    const collectResult = applyPelletCollect(this.pelletProgress, removed);
    this.pelletProgress = collectResult.progress;
    if (removed > 0) {
      this.lifetimeCollected += removed;
    }
    this.collectedText.setText(this.collectedLabel());

    const modeStep = resolveGhostModeStep(
      this.ghostModeClock,
      scatterBurstActive(this.runUpgrades),
      delta,
    );
    this.ghostModeClock = modeStep.clock;
    if (modeStep.mode !== this.previousEffectiveGhostMode) {
      forceGhostReverse(this.world);
      this.previousEffectiveGhostMode = modeStep.mode;
    } else {
      ghostAi(this.world, modeStep.mode, this.pelletProgress.pelletsRemaining, {
        ignoreElroy: scatterBurstActive(this.runUpgrades),
      });
    }
    if (powerEffects.recallClosestGhost) {
      recallClosestGhostToHouse(
        this.world,
        this.ghostReleaseClock,
        this.pelletProgress.boardCollected,
        this.afterLifeRelease,
      );
    }
    if (powerEffects.warpPlayerTopCenter) {
      warpPlayerToTopCenter(this.world);
    }

    const fruitTick = tickFruitPresence(
      this.fruitPresence,
      this.pelletProgress.boardCollected,
      delta,
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
      this.fruitPresence = markFruitCollected(fruitTick.state);
      const options = pickUpgradeChoiceOffer(
        this.runUpgrades.owned,
        this.runUpgrades.lastDeclinedUpgradeId,
        () => Math.random(),
        this.runUpgrades.forceNextId,
      );
      if (options === null) {
        this.runUpgrades = { ...this.runUpgrades, forceNextId: null };
      } else {
        this.upgradeChoiceModal.open(options, (chosen) => {
          const alreadyOwned = this.runUpgrades.owned.includes(chosen);
          this.runUpgrades = confirmUpgradeChoice(this.runUpgrades, options, chosen);
          if (!alreadyOwned) {
            this.lives += grantLivesForUpgrade(chosen);
            this.refreshLivesIcons();
          }
          this.refreshUpgradesHud();
          this.beginUpgradeResumeCountdown();
        });
        const ghostsFrozen = ghostsAreFrozen(this.runUpgrades);
        this.playRender.draw(this.world, { ghostsFrozen });
        return;
      }
    } else if (fruitTick.action === "despawn") {
      this.clearFruitEntities();
      this.fruitPresence = fruitTick.state;
    } else {
      this.fruitPresence = fruitTick.state;
    }

    if (collectResult.shouldRecordClear) {
      stopLoopingSfx(this, "siren");
      playSfx(this, "levelComplete");
      this.levelTransitionRemainingMs = LEVEL_TRANSITION_MS;
      this.playRender.draw(this.world, { ghostsFrozen: ghostsAreFrozen(this.runUpgrades) });
      return;
    }

    const ghostsFrozen = ghostsAreFrozen(this.runUpgrades);
    const caught = catchPlayer(this.world, { ghostsFrozen });
    this.playRender.draw(this.world, { ghostsFrozen });

    if (caught) {
      stopLoopingSfx(this, "siren");
      playSfx(this, "death");
      const result = livesRemainingAfterCatch(this.lives);
      this.lives = result.lives;
      this.refreshLivesIcons();
      if (result.gameOver) {
        saveRun(this.lifetimeCollected, this.clock.remaining);
      }
      this.death = beginDeathSequence(result.gameOver);
    }
  }

  private startBoard(layoutOverride: MazeLayoutId | null = null): void {
    activateLayout(pickLayoutId(Math.random, layoutOverride));
    this.playRender.resetForNewBoard();
    this.world = createWorld();
    this.spawnWalls();
    this.spawnPellets();
    this.spawnPlayer();
    for (const kind of ghostKindsForLevel(this.levelIndex)) {
      this.spawnGhost(kind);
    }

    this.clock = createRunClock();
    this.ghostReleaseClock = createGhostReleaseClock();
    this.ghostModeClock = createGhostModeClock();
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.fruitPresence = createFruitPresence();
    this.afterLifeRelease = false;
    placeInHouseGhostsAtPredictedSeats(
      this.world,
      this.ghostReleaseClock,
      this.pelletProgress.boardCollected,
      this.afterLifeRelease,
    );
    this.death = null;
    this.suppressPlayerInputUntilKeyRelease = false;

    this.collectedText.setText(this.collectedLabel());
    this.timerText.setText(this.timerLabel());
    placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);
  }

  private advanceToNextLevel(): void {
    this.upgradeChoiceModal.destroy();
    this.upgradeChoiceModal = createUpgradeChoiceModal(this);
    this.clearUpgradeResumeCountdown();

    this.levelIndex += 1;
    this.runUpgrades = {
      ...this.runUpgrades,
      freezeRemainingMs: 0,
      scatterBurstRemainingMs: 0,
    };

    this.startBoard(null);
    this.refreshUpgradesHud();
    this.refreshLivesIcons();
    this.showLevelBanner();
    startLoopingSfx(this, "siren");
    this.playRender.draw(this.world, { ghostsFrozen: false });
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

  private beginUpgradeResumeCountdown(): void {
    this.clearUpgradeResumeCountdown();
    this.resumeCountdownRemainingMs = UPGRADE_RESUME_COUNTDOWN_MS;
    this.resumeCountdownDim = this.add
      .rectangle(
        PLAYFIELD_WIDTH / 2,
        PLAYFIELD_HEIGHT / 2,
        PLAYFIELD_WIDTH,
        PLAYFIELD_HEIGHT,
        0x000000,
        0.45,
      )
      .setDepth(900);
    this.resumeCountdownText = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      "3",
      MENU_TITLE_FONT_SIZE * 2,
      TEXT_COLOR_YELLOW,
    ).setDepth(901);
    this.refreshUpgradeResumeCountdownText();
  }

  private refreshUpgradeResumeCountdownText(): void {
    if (this.resumeCountdownText === null || this.resumeCountdownRemainingMs <= 0) {
      return;
    }
    const seconds = Math.max(1, Math.ceil(this.resumeCountdownRemainingMs / 1000));
    this.resumeCountdownText.setText(String(seconds));
    placePixelText(this.resumeCountdownText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, 0.5, 0.5);
  }

  private clearUpgradeResumeCountdown(): void {
    this.resumeCountdownRemainingMs = 0;
    this.resumeCountdownDim?.destroy();
    this.resumeCountdownDim = null;
    this.resumeCountdownText?.destroy();
    this.resumeCountdownText = null;
  }

  private handleDeathEvent(event: DeathSequenceEvent): void {
    switch (event) {
      case "resetActors":
        this.resetAfterLifeLoss();
        this.playRender.draw(this.world, { ghostsFrozen: false });
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

  private showGameOverText(): void {
    const title = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2 - 20,
      "GAME OVER",
      MENU_TITLE_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    ).setDepth(1001);
    placePixelText(title, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2 - 20, 0.5, 0.5);

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
    this.ghostModeClock = createGhostModeClock();
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
      scatterBurstRemainingMs: 0,
    };

    this.clock = {
      ...this.clock,
      started: false,
    };
  }

  private refreshLivesIcons(): void {
    for (const icon of this.lifeIcons) {
      icon.destroy();
    }
    this.lifeIcons = [];
    const size = playerDisplaySize();
    const y = PLAYFIELD_HEIGHT - 8 - size / 2;
    const icons = livesIconCount(this.lives);
    for (let i = 0; i < icons; i += 1) {
      const x = 12 + size / 2 + i * (size + 4);
      const icon = this.add
        .image(x, y, PLAYER_OPEN_MOUTH_TEXTURE_KEY)
        .setDisplaySize(size, size)
        .setDepth(10);
      this.lifeIcons.push(icon);
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
    Drawable.radius[eid] = PLAYER_RADIUS;
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
    Drawable.radius[eid] = GHOST_RADIUS;
  }
}
