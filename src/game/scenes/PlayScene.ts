import { addComponent, addEntity, createWorld, type World } from "bitecs";
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
  type DeathSequenceState,
} from "../../domain/deathSequence";
import {
  activateLayout,
  ghostHouseSpawnCenter,
  parseMazeParam,
  pelletCellCenters,
  pickLayoutId,
  playerSpawnCenter,
  wallCellCenters,
} from "../../domain/maze";
import {
  BLINKY_DRAWABLE_ID,
  CLYDE_DRAWABLE_ID,
  FRUIT_DRAWABLE_ID,
  FRUIT_RADIUS,
  GHOST_RADIUS,
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
import { GHOST_KIND } from "../../domain/ghostKind";
import { GHOST_PHASE } from "../../domain/ghostTarget";
import {
  applyPowerPelletEffects,
  createRunUpgrades,
  ghostsAreFrozen,
  ghostSpeedMultiplier,
  grantRandomUpgrade,
  parseEnableUpgradeParams,
  parseUpgradeId,
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
import { saveSuccessfulRun } from "../storage/runHistoryStorage";
import { catchPlayer } from "../systems/catchPlayer";
import { collectFruit, removeAllFruit } from "../systems/collectFruit";
import { collectPellets, countPellets } from "../systems/collectPellets";
import { ghostAi } from "../systems/ghostAi";
import { ghostExitHouse } from "../systems/ghostExitHouse";
import { recallClosestGhostToHouse } from "../systems/ghostRecall";
import { ghostRelease } from "../systems/ghostRelease";
import { forceGhostReverse } from "../systems/ghostReverse";
import { applyGhostSpeed } from "../systems/ghostSpeed";
import { movement } from "../systems/movement";
import { hasPlayerDirectionInput } from "../systems/playerDirection";
import { createPlayerInput } from "../systems/playerInput";
import { applyPlayerSpeed } from "../systems/playerSpeed";
import { warpPlayerToTopCenter } from "../systems/playerWarp";
import { createRender, preloadPlayArt, type PlayRender } from "../systems/render";
import { addPixelText, HUD_FONT_SIZE, UPGRADES_HUD_FONT_SIZE, placePixelText } from "./pixelFont";

export class PlayScene extends Phaser.Scene {
  private world!: World;
  private runPlayerInput!: (world: World) => void;
  private playRender!: PlayRender;
  private clock: RunClock = createRunClock();
  private ghostReleaseClock: GhostReleaseClock = createGhostReleaseClock();
  private ghostModeClock: GhostModeClock = createGhostModeClock();
  private previousEffectiveGhostMode: GhostAiMode = createGhostModeClock().mode;
  private pelletProgress: PelletProgress = createPelletProgress(0);
  private fruitPresence: FruitPresence = createFruitPresence();
  private runUpgrades: RunUpgrades = createRunUpgrades();
  private collectedText!: Phaser.GameObjects.BitmapText;
  private timerText!: Phaser.GameObjects.BitmapText;
  private upgradesText!: Phaser.GameObjects.BitmapText;
  private death: DeathSequenceState | null = null;

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    preloadPlayArt(this);
    preloadSfx(this);
  }

  create(): void {
    this.world = createWorld();
    this.death = null;
    const urlParams = new URLSearchParams(location.search);
    const mazeOverride = parseMazeParam(urlParams);
    if (urlParams.has("maze") && mazeOverride === null) {
      console.warn(`Unknown ?maze= value; expected classic|mspac`);
    }
    activateLayout(pickLayoutId(Math.random, mazeOverride));
    this.spawnWalls();
    this.spawnPellets();
    this.spawnPlayer();
    this.spawnBlinky();
    this.spawnPinky();
    this.spawnClyde();

    this.clock = createRunClock();
    this.ghostReleaseClock = createGhostReleaseClock();
    this.ghostModeClock = createGhostModeClock();
    this.previousEffectiveGhostMode = this.ghostModeClock.mode;
    this.pelletProgress = createPelletProgress(countPellets(this.world));
    this.fruitPresence = createFruitPresence();
    this.runUpgrades = createRunUpgrades(
      parseUpgradeId(urlParams.get("forceUpgrade")),
      parseEnableUpgradeParams(urlParams),
    );

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
    this.refreshUpgradesHud();

    this.runPlayerInput = createPlayerInput(this);
    this.playRender = createRender(this);

    startLoopingSfx(this, "siren");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopLoopingSfx(this, "siren");
      stopLoopingSfx(this, "death");
    });
  }

  update(_time: number, delta: number): void {
    if (this.death !== null) {
      const tick = tickDeathSequence(this.death, delta);
      this.death = tick.state;
      if (tick.shouldStartFade) {
        this.startDeathFadeOverlay();
      }
      return;
    }

    this.runPlayerInput(this.world);
    const hasInput = hasPlayerDirectionInput(this.world);

    this.ghostReleaseClock = tickGhostRelease(this.ghostReleaseClock, hasInput, delta);
    ghostRelease(this.world, this.ghostReleaseClock, this.pelletProgress.collectedCount);

    this.runUpgrades = tickFreeze(this.runUpgrades, delta);
    this.runUpgrades = tickScatterBurst(this.runUpgrades, delta);
    const frozen = ghostsAreFrozen(this.runUpgrades);
    applyPlayerSpeed(this.world, playerSpeedMultiplier(this.runUpgrades.owned));
    applyGhostSpeed(this.world, this.pelletProgress.pelletsRemaining, {
      ghostSpeedMul: ghostSpeedMultiplier(this.runUpgrades.owned),
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
      playPelletCollectSfx(this, this.pelletProgress.collectedCount, removed, powerRemoved);
    }
    const powerEffects = applyPowerPelletEffects(this.runUpgrades, powerRemoved);
    this.runUpgrades = powerEffects.state;
    const collectResult = applyPelletCollect(this.pelletProgress, removed);
    this.pelletProgress = collectResult.progress;
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
      recallClosestGhostToHouse(this.world);
    }
    if (powerEffects.warpPlayerTopCenter) {
      warpPlayerToTopCenter(this.world);
    }

    const fruitTick = tickFruitPresence(
      this.fruitPresence,
      this.pelletProgress.collectedCount,
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
      this.runUpgrades = grantRandomUpgrade(this.runUpgrades, () => Math.random());
      this.refreshUpgradesHud();
    } else if (fruitTick.action === "despawn") {
      this.clearFruitEntities();
      this.fruitPresence = fruitTick.state;
    } else {
      this.fruitPresence = fruitTick.state;
    }

    if (collectResult.shouldRecordClear) {
      stopLoopingSfx(this, "siren");
      playSfx(this, "levelComplete");
      saveSuccessfulRun(this.clock.remaining);
    }

    const ghostsFrozen = ghostsAreFrozen(this.runUpgrades);
    const caught = catchPlayer(this.world, { ghostsFrozen });
    this.playRender.draw(this.world, { ghostsFrozen });

    if (caught) {
      stopLoopingSfx(this, "siren");
      playSfx(this, "death");
      this.death = beginDeathSequence();
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
      onComplete: () => {
        this.scene.start("MenuScene");
      },
    });
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
    return `Collected: ${this.pelletProgress.collectedCount}`;
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

  private spawnBlinky(): void {
    this.spawnGhost(GHOST_KIND.blinky, BLINKY_DRAWABLE_ID);
  }

  private spawnPinky(): void {
    this.spawnGhost(GHOST_KIND.pinky, PINKY_DRAWABLE_ID);
  }

  private spawnClyde(): void {
    this.spawnGhost(GHOST_KIND.clyde, CLYDE_DRAWABLE_ID);
  }

  private spawnGhost(kind: number, drawableId: string): void {
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

    const spawn = ghostHouseSpawnCenter();
    Position.x[eid] = spawn.x;
    Position.y[eid] = spawn.y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Input.direction[eid] = DIRECTION.none;
    Facing.direction[eid] = DIRECTION.none;
    Speed.px[eid] = 0;
    GhostKind.kind[eid] = kind;
    GhostPhase.value[eid] = GHOST_PHASE.inHouse;
    Ghost.decidedCol[eid] = Number.NaN;
    Ghost.decidedRow[eid] = Number.NaN;
    Drawable.id[eid] = drawableId;
    Drawable.radius[eid] = GHOST_RADIUS;
  }
}
