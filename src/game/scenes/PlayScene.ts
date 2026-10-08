import Phaser from "phaser";
import {
  barRects,
  BONUS_ART_SCALE,
  BONUS_BAR_ART_H,
  BONUS_BAR_ART_W,
  BONUS_COLORS,
  bonusBarGlowFilter,
  bonusBumpFx,
  bumpBarFx,
  createBarFx,
  fillBarFx,
  neonBarTube,
  slowFillBarFx,
  stepBarFx,
  type BarFxState,
  type NeonBarTube,
} from "../../domain/bonusBarFx";
import { playTurnSparks } from "./turnSparks";
import { DEATH_FADE_DURATION_MS } from "../../domain/deathSequence";
import { livesHudIconCount } from "../../domain/lives";
import {
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_PIXEL_HEIGHT,
  pelletDisplaySize,
  playerDisplaySize,
} from "../../domain/maze";
import { ghostLineArtLook, type GhostStyle } from "../../domain/ghostArt";
import { wallStyleFor } from "../../domain/wallStyle";
import { pelletStyleFor } from "../../domain/pelletStyle";
import { DEFAULT_TUNING, type Tuning } from "../../domain/tuning";
import { moneyTalksCoinLook, quarterHudIconPosition } from "../../domain/moneyTalks";
import { parsePlayOptions } from "../../domain/playOptions";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { freshSeed } from "../../domain/runRandom";
import { withSeenGhosts, withSeenUpgrade } from "../../domain/seenRecord";
import { getUpgradeDef, upgradeLabels, type UpgradeId } from "../../domain/upgrades";
import {
  HUD_ICON_GAP,
  HUD_ICON_LEFT_X,
  SHIELD_HUD_COLOR,
  SHIELD_HUD_SIZE_FRAC,
  shieldCrackLook,
  shieldHudIconX,
} from "../../domain/shieldCrack";
import {
  isSfxPlaying,
  playPelletCollectSfx,
  playSfx,
  preloadSfx,
  startLoopingSfx,
  stopLoopingSfx,
  type SfxId,
} from "../audio/sfx";
import { PlaySim } from "../sim/playSim";
import type { MoneyTalksSpend, SimEvent } from "../sim/simEvents";
import { clearDebugTuning, loadDebugTuning, saveDebugTuning } from "../storage/debugTuningStorage";
import { loadGhostStyle } from "../storage/ghostStyleStorage";
import { saveRun } from "../storage/runHistoryStorage";
import { newRunLogMeta, saveRunLog } from "../storage/runLogStorage";
import { loadSeenRecord, saveSeenRecord } from "../storage/seenRecordStorage";
import type { HeldKeys } from "../systems/heldKeys";
import { createHeldKeysReader } from "../systems/playerInput";
import {
  addDotManIcon,
  createRender,
  preloadPlayArt,
  QUARTER_TEXTURE_KEY,
  type PlayRender,
} from "../systems/render";
import {
  HUD_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  TEXT_COLOR_YELLOW,
  UPGRADES_HUD_FONT_SIZE,
} from "./pixelFont";
import { addGameText, placeGameText, setActiveFontLook, type GameText } from "./neonFont";
import { fontLineArtLook } from "../../domain/neonFont/fontLook";
import { textStyleFor } from "../../domain/ghostArt";
import { createKnobsPanel, type KnobsPanel } from "./knobsPanel";
import { createRunEndMenu, type RunEndMenu } from "./runEndMenu";
import { addSeedLabel } from "./seedLabel";
import { createStartingUpgradeCard, type StartingUpgradeCard } from "./startingUpgradeCard";
import { playStreakPop } from "./streakPop";
import { createStoreOverlay, type StoreOverlay } from "./storeOverlay";
import {
  createUpgradeChoiceModal,
  SCHOOL_COLORS,
  type UpgradeChoiceModal,
} from "./upgradeChoiceModal";
import { applyRenderScale, renderScaleOf } from "../renderScale";

const BONUS_GLOW_QUALITY = 24;
const BONUS_GLOW_PAD_WORLD = 12;
const BONUS_TUBE_INSET = 2;
const BONUS_TUBE_STROKE = 2;
const BONUS_TRACK_ALPHA = 0.45;
const LEVEL_BANNER_FADE_MS = 1500;
const WALLET_COIN_DEPTH = 900;
const BOSS_BANNER_SLAM_MS = 220;
const BOSS_BANNER_HOLD_MS = 1200;
const BOSS_BANNER_FADE_MS = 800;
const BOSS_BANNER_START_SCALE = 3;
const BOSS_BANNER_COLOR = 0xff3b3b;
const BOSS_SHAKE_MS = 400;
const BOSS_SHAKE_INTENSITY = 0.02;
const BONUS_BAR_X = PLAYFIELD_WIDTH / 2 - (BONUS_BAR_ART_W * BONUS_ART_SCALE) / 2;
const BONUS_BAR_Y = 8;
const BONUS_LABEL_GAP = 8;
const TIME_BONUS_TINT = 0xffd800;
const CHROME_SHAKE_STEP_MS = 90;
const CHROME_SHAKE_OFFSETS: readonly (readonly [number, number])[] = [
  [-6, 3],
  [6, -3],
  [-3, -3],
  [3, 3],
  [0, 0],
];

type PlaySceneData = { restartLevel?: number; seed?: string };

export class PlayScene extends Phaser.Scene {
  private sim!: PlaySim;
  private readHeldKeys!: () => HeldKeys;
  private playRender!: PlayRender;
  private storeOverlay: StoreOverlay | null = null;
  private storeChoice: "yes" | "no" | null = null;
  private storeClick: number | null = null;
  private storePointer: { x: number; y: number } | null = null;
  private pointerOverStoreExit = false;
  private chrome!: Phaser.GameObjects.Container;
  private sideHud!: Phaser.GameObjects.Container;
  private knobsPanel: KnobsPanel | null = null;
  private chromeShake: Phaser.Time.TimerEvent | null = null;
  private bonusGlowGfx!: Phaser.GameObjects.Graphics;
  private bonusGfx!: Phaser.GameObjects.Graphics;
  private bonusGlowKey = "";
  private ghostStyle: GhostStyle = "neon";
  private barFx!: BarFxState;
  private quarterIcons: Phaser.GameObjects.Image[] = [];
  private walletCoins: Phaser.GameObjects.Image[] = [];
  private timerText!: GameText;
  private upgradeLines: GameText[] = [];
  private levelBannerText: GameText | null = null;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private shieldIcons: Phaser.GameObjects.Rectangle[] = [];
  private shieldCrackHalves: Phaser.GameObjects.Rectangle[] = [];
  private upgradeChoiceModal!: UpgradeChoiceModal;
  private startingUpgradeCard!: StartingUpgradeCard;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private storeToggleKeys: Phaser.Input.Keyboard.Key[] = [];
  private storeConfirmKeys: Phaser.Input.Keyboard.Key[] = [];
  private musicPendingFanfareEnd: SfxId | null = null;
  private runEndMenu: RunEndMenu | null = null;
  private pausedAtMs: number | null = null;
  private hiddenAtMs: number | null = null;

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    preloadPlayArt(this);
    preloadSfx(this);
  }

  create(data: PlaySceneData = {}): void {
    applyRenderScale(this);
    stopLoopingSfx(this, "menuMusic");
    this.clearLevelBanner();

    const params = new URLSearchParams(location.search);
    const { options, warnings } = parsePlayOptions(params);
    for (const warning of warnings) {
      console.warn(warning);
    }
    this.sys.settings.data = {};
    if (data.restartLevel !== undefined) {
      options.level = data.restartLevel;
      options.jumpToUpgrade = false;
      options.store = null;
    }
    const tuning = options.knobs ? loadDebugTuning() : DEFAULT_TUNING;
    const runLogMeta = newRunLogMeta(params);
    this.sim = new PlaySim(options, data.seed ?? options.seed ?? freshSeed(), tuning, runLogMeta);
    this.ghostStyle = loadGhostStyle();
    this.sim.setGhostStyle(this.ghostStyle);
    this.bonusGlowKey = "";
    this.pausedAtMs = null;
    this.hiddenAtMs = null;

    this.upgradeChoiceModal?.destroy();
    this.upgradeChoiceModal = createUpgradeChoiceModal(this, this.sim.random.stream("upgradeFx"));
    this.startingUpgradeCard?.destroy();
    this.startingUpgradeCard = createStartingUpgradeCard(this);
    this.closeStoreUi();
    this.runEndMenu = null;

    this.chrome = this.add.container(0, 0).setDepth(10);
    this.sideHud = this.add.container(0, 0).setVisible(!options.knobs);
    this.chrome.add(this.sideHud);
    this.chromeShake = null;
    this.timerText = addGameText(this, PLAYFIELD_WIDTH - 12, 8, this.timerLabel(), HUD_FONT_SIZE);
    placeGameText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);

    this.upgradeLines = [];

    const bonusLabel = addGameText(this, 0, 0, "BONUS", HUD_FONT_SIZE);
    placeGameText(bonusLabel, BONUS_BAR_X - BONUS_LABEL_GAP, BONUS_BAR_Y, 1, 0);
    // Glow lives outside chrome (filters + Container break focus); position tracks chrome shake.
    this.bonusGlowGfx = this.add.graphics().setDepth(9);
    this.bonusGfx = this.add.graphics({ x: BONUS_BAR_X, y: BONUS_BAR_Y });
    this.barFx = createBarFx(this.sim.hud().bonusCharge);
    this.sideHud.add(this.timerText);
    this.chrome.add([bonusLabel, this.bonusGfx]);
    this.lifeIcons = [];
    this.shieldIcons = [];
    this.shieldCrackHalves = [];
    this.quarterIcons = [];
    this.walletCoins = [];
    this.refreshQuartersHud(false);

    this.readHeldKeys = createHeldKeysReader(this);
    this.musicPendingFanfareEnd = null;
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.storeToggleKeys = [KeyCodes.LEFT, KeyCodes.RIGHT, KeyCodes.A, KeyCodes.D].map((code) =>
      this.input.keyboard!.addKey(code),
    );
    this.storeConfirmKeys = [KeyCodes.ENTER, KeyCodes.SPACE].map((code) =>
      this.input.keyboard!.addKey(code),
    );
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.storePointer = { x: pointer.worldX, y: pointer.worldY };
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const overExit = this.sim.storeExitUnder(pointer.worldX, pointer.worldY);
      if (overExit !== this.pointerOverStoreExit) {
        this.pointerOverStoreExit = overExit;
        this.input.setDefaultCursor(overExit ? "pointer" : "default");
      }
    });
    this.playRender = createRender(this);
    if (options.knobs) {
      this.openKnobsPanel(tuning);
    }

    this.applyEvents(this.sim.start(), 0);

    const onVisibilityChange = (): void => this.trackHiddenTime();
    const onPageHide = (): void => saveRunLog(this.sim.runLogRecord());
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      this.applyEvents(this.sim.finishRun("quit"), 0);
      stopLoopingSfx(this, "gameplayMusic");
      stopLoopingSfx(this, "death");
      stopLoopingSfx(this, "revive");
      this.upgradeChoiceModal.destroy();
      this.startingUpgradeCard.destroy();
      this.closeStoreUi();
      this.clearLevelBanner();
      this.knobsPanel?.destroy();
      this.knobsPanel = null;
    });
  }

  private openKnobsPanel(tuning: Tuning): void {
    this.applyKnobTuning(tuning);
    this.knobsPanel = createKnobsPanel({
      canvas: this.game.canvas,
      tuning,
      level: this.sim.currentLevel(),
      layout: () => ({ offsetX: MAZE_OFFSET_X, mazeBottomY: MAZE_OFFSET_Y + MAZE_PIXEL_HEIGHT }),
      onChange: (next) => {
        this.applyKnobTuning(next);
        saveDebugTuning(next);
      },
      onRestart: () => this.restartAtCurrentLevel(),
      onReset: () => {
        clearDebugTuning();
        this.restartAtCurrentLevel();
      },
    });
  }

  private applyKnobTuning(tuning: Tuning): void {
    this.sim.setTuning(tuning);
    this.playRender.setWallStyle(wallStyleFor(tuning, 0));
    this.playRender.setPelletStyle(pelletStyleFor(tuning, 0));
    this.playRender.setGhostLook(ghostLineArtLook(tuning));
    this.playRender.setDotManChompSpeed(tuning.dotManChompSpeed);
    setActiveFontLook(fontLineArtLook(tuning));
  }

  private restartAtCurrentLevel(): void {
    const data: PlaySceneData = {
      restartLevel: this.sim.currentLevel(),
      seed: this.sim.random.seed,
    };
    this.scene.restart(data);
  }

  update(_time: number, delta: number): void {
    if (this.musicPendingFanfareEnd !== null && !isSfxPlaying(this, "levelComplete")) {
      startLoopingSfx(this, this.musicPendingFanfareEnd);
      this.musicPendingFanfareEnd = null;
    }

    const escDown = Phaser.Input.Keyboard.JustDown(this.keyEsc);
    if (escDown && this.runEndMenu === null && !this.sim.storeRouting()) {
      this.pauseForMenu();
      return;
    }

    if (this.startingUpgradeCard.isActive()) {
      this.startingUpgradeCard.tick(delta);
    } else if (this.upgradeChoiceModal.isActive()) {
      this.upgradeChoiceModal.tick(delta);
    }
    const readsStoreKeys = this.sim.readsStoreKeys();
    const events = this.sim.step(
      {
        keys: this.readHeldKeys(),
        uiOpen: this.startingUpgradeCard.isActive() || this.upgradeChoiceModal.isActive(),
        storeToggle:
          readsStoreKeys && this.storeToggleKeys.some((key) => Phaser.Input.Keyboard.JustDown(key)),
        storeConfirm:
          readsStoreKeys &&
          this.storeConfirmKeys.some((key) => Phaser.Input.Keyboard.JustDown(key)),
        storeChoice: readsStoreKeys ? this.storeChoice : null,
        storeClick: readsStoreKeys ? this.storeClick : null,
        storePointer: readsStoreKeys ? this.storePointer : null,
        storeCancelRoute: escDown,
      },
      delta,
    );
    this.storeChoice = null;
    this.storeClick = null;
    this.storePointer = null;
    this.applyEvents(events, delta);
    this.barFx = stepBarFx(this.barFx, delta, this.sim.hud().bonusCharge);
    this.drawBonusBar();
    this.runEndMenu?.tick(this.sim.runEndMenuArmed());
    this.knobsPanel?.sync(this.sim.currentLevel());
  }

  public runSeed(): string {
    return this.sim.random.seed;
  }

  public ownedUpgrades(): readonly UpgradeId[] {
    return this.sim.hud().upgrades;
  }

  public currentMusicId(): SfxId {
    return this.sim.storeState() !== null ? "storeMusic" : "gameplayMusic";
  }

  public debugSnapshot() {
    return {
      ...this.sim.snapshot(),
      textStyle: textStyleFor(loadGhostStyle()),
      startingUpgradeCardOpen: this.startingUpgradeCard.isActive(),
      upgradeModalOpen: this.upgradeChoiceModal.isActive(),
      upgradeOffer: this.upgradeChoiceModal.offer()?.upgrades ?? null,
      upgradeOfferEnhanced: this.upgradeChoiceModal.offer()?.enhanced ?? null,
      cursor: this.input.manager.canvas.style.cursor || "default",
      runEndMenu: {
        open: this.runEndMenu !== null,
        selected: this.runEndMenu?.selected() ?? null,
      },
    };
  }

  public resumeFromPauseMenu(): void {
    if (this.pausedAtMs !== null) {
      this.sim.notePause(performance.now() - this.pausedAtMs);
      this.pausedAtMs = null;
    }
    this.sim.suppressInputUntilRelease();
    // Settings may have been opened from the pause menu.
    this.ghostStyle = loadGhostStyle();
    this.sim.setGhostStyle(this.ghostStyle);
    this.bonusGlowKey = "";
    const timerVisible = this.timerText.visible;
    this.timerText.destroy();
    this.timerText = addGameText(this, PLAYFIELD_WIDTH - 12, 8, this.timerLabel(), HUD_FONT_SIZE);
    placeGameText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);
    this.timerText.setVisible(timerVisible);
    this.sideHud.add(this.timerText);
    if (this.upgradeChoiceModal.isActive()) {
      this.upgradeChoiceModal.rearmSelectionKeys();
    }
    this.refreshUpgradesHud();
    this.refreshLivesIcons(false);
    this.scene.resume();
  }

  private trackHiddenTime(): void {
    if (document.hidden) {
      this.hiddenAtMs = performance.now();
    } else if (this.hiddenAtMs !== null) {
      this.sim.noteHidden(performance.now() - this.hiddenAtMs);
      this.hiddenAtMs = null;
    }
  }

  private pauseForMenu(): void {
    this.pausedAtMs = performance.now();
    this.upgradeLines.forEach((line) => line.setVisible(false));
    this.clearStoreExitCursor();
    this.scene.pause();
    this.scene.launch("PauseScene");
  }

  private applyEvents(events: readonly SimEvent[], delta: number): void {
    for (const event of events) {
      this.applyEvent(event, delta);
    }
  }

  private applyEvent(event: SimEvent, delta: number): void {
    switch (event.type) {
      case "sfx":
        playSfx(this, event.id);
        break;
      case "pelletSfx":
        playPelletCollectSfx(this, event.previousCollected, event.removed, event.powerRemoved);
        break;
      case "loopStart":
        startLoopingSfx(this, event.id);
        break;
      case "loopStop":
        stopLoopingSfx(this, event.id);
        break;
      case "musicAfterFanfare":
        if (isSfxPlaying(this, "levelComplete")) {
          this.musicPendingFanfareEnd = event.id;
        } else {
          startLoopingSfx(this, event.id);
        }
        break;
      case "releaseDrawable":
        this.playRender.releaseDrawable(event.eid);
        break;
      case "resetBoard":
        this.playRender.resetForNewBoard();
        break;
      case "draw":
        this.playRender.draw(this.sim.world, event.options);
        break;
      case "bouncePowerPellet":
        this.playRender.bouncePowerPellet(event.eid);
        break;
      case "turnSparks":
        playTurnSparks(this, event);
        break;
      case "streakPop":
        playStreakPop(this, event);
        break;
      case "banner":
        if (event.boss) {
          this.showBossBanner();
        } else {
          this.showLevelBanner(event.text);
        }
        break;
      case "lives":
        this.refreshLivesIcons(event.pulse);
        break;
      case "quarters":
        this.refreshQuartersHud(event.pulse);
        break;
      case "shields":
        this.refreshShieldIcons();
        break;
      case "shieldCrack":
        this.drawShieldCrack(event.index, event.progress);
        break;
      case "walletCoins":
        this.drawWalletCoins(event.spend);
        break;
      case "bonus":
        this.applyBonusFx(event.tier, event.filled);
        break;
      case "fruitBonus":
        this.barFx = slowFillBarFx(this.barFx);
        break;
      case "upgrades":
        this.refreshUpgradesHud();
        break;
      case "timer":
        this.timerText.setText(this.timerLabel());
        placeGameText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);
        break;
      case "timerVisible":
        this.timerText.setVisible(event.visible);
        break;
      case "timeBonus":
        if (event.active) {
          this.timerText.setTint(TIME_BONUS_TINT);
        } else {
          this.timerText.clearTint();
        }
        break;
      case "startingUpgrade":
        this.startingUpgradeCard.open(event.id);
        break;
      case "upgradeOffer":
        this.upgradeChoiceModal.open(event.offer, (chosen) => {
          this.applyEvents(this.sim.chooseUpgrade(chosen), delta);
        });
        break;
      case "newLevelModal":
        this.upgradeChoiceModal.destroy();
        this.upgradeChoiceModal = createUpgradeChoiceModal(
          this,
          this.sim.random.stream("upgradeFx"),
        );
        break;
      case "storeOpened":
        this.storeOverlay = createStoreOverlay(
          this,
          (choice) => {
            this.storeChoice = choice;
          },
          (index) => {
            this.storeClick = index;
          },
        );
        this.storeOverlay.open(this.sim.storeState()!);
        break;
      case "storeSync":
        this.storeOverlay?.sync(this.sim.storeState()!, event.prompt, delta);
        break;
      case "storePurchased":
        this.storeOverlay?.showPurchased(event.id);
        break;
      case "storeClosed":
        this.closeStoreUi();
        break;
      case "deathFade":
        this.startDeathFadeOverlay();
        break;
      case "endText":
        this.showCenteredEndText(event.title);
        if (event.title === "RUN COMPLETE") {
          this.runEndMenu = createRunEndMenu(this, (choice) => {
            this.applyEvents(this.sim.chooseRunEnd(choice), delta);
          });
        }
        break;
      case "goToMenu":
        this.scene.start("MenuScene");
        break;
      case "newGame":
        this.scene.restart({});
        break;
      case "saveRun":
        saveRun(event.collected, event.remaining);
        break;
      case "runLog":
        saveRunLog(event.record);
        break;
      case "seenGhosts": {
        const seen = loadSeenRecord();
        const next = withSeenGhosts(seen, event.ghostKinds);
        if (next !== seen) {
          saveSeenRecord(next);
        }
        break;
      }
      case "seenUpgrades": {
        const seen = loadSeenRecord();
        let next = seen;
        for (const id of event.ids) {
          next = withSeenUpgrade(next, id);
        }
        if (next !== seen) {
          saveSeenRecord(next);
        }
        break;
      }
    }
  }

  private closeStoreUi(): void {
    if (this.musicPendingFanfareEnd === "storeMusic") {
      this.musicPendingFanfareEnd = null;
    }
    stopLoopingSfx(this, "storeMusic");
    this.storeOverlay?.destroy();
    this.storeOverlay = null;
    this.clearStoreExitCursor();
  }

  private clearStoreExitCursor(): void {
    this.pointerOverStoreExit = false;
    this.input.setDefaultCursor("default");
  }

  private showLevelBanner(text: string): void {
    this.clearLevelBanner();
    const banner = addGameText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      text,
      MENU_TITLE_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    ).setDepth(800);
    placeGameText(banner, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2, 0.5, 0.5);
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

  private showBossBanner(): void {
    this.clearLevelBanner();
    const x = PLAYFIELD_WIDTH / 2;
    const y = PLAYFIELD_HEIGHT / 2;
    const banner = addGameText(this, 0, 0, "BOSS", MENU_TITLE_FONT_SIZE * 2, BOSS_BANNER_COLOR);
    placeGameText(banner, 0, 0, 0.5, 0.5);
    const wrap = this.add.container(x, y, [banner]).setDepth(800).setScale(BOSS_BANNER_START_SCALE);
    this.levelBannerText = banner;
    this.tweens.add({
      targets: wrap,
      scale: 1,
      duration: BOSS_BANNER_SLAM_MS,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.shakeCamera();
        this.tweens.add({
          targets: wrap,
          alpha: 0,
          delay: BOSS_BANNER_HOLD_MS,
          duration: BOSS_BANNER_FADE_MS,
          onComplete: () => {
            if (this.levelBannerText === banner) {
              this.clearLevelBanner();
            }
          },
        });
      },
    });
  }

  private shakeCamera(): void {
    const camera = this.cameras.main;
    const shake = this.sim.random.stream("bossShake");
    const maxX = BOSS_SHAKE_INTENSITY * PLAYFIELD_WIDTH;
    const maxY = BOSS_SHAKE_INTENSITY * PLAYFIELD_HEIGHT;
    this.tweens.addCounter({
      duration: BOSS_SHAKE_MS,
      onUpdate: () => camera.setScroll((shake() * 2 - 1) * maxX, (shake() * 2 - 1) * maxY),
      onComplete: () => camera.setScroll(0, 0),
    });
  }

  private clearLevelBanner(): void {
    const text = this.levelBannerText;
    if (text === null) {
      return;
    }
    const parent = text.parentContainer;
    if (parent !== null) {
      parent.destroy();
    } else {
      text.destroy();
    }
    this.levelBannerText = null;
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

  private showCenteredEndText(title: string): void {
    const titleText = addGameText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2 - 20,
      title,
      MENU_TITLE_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    ).setDepth(1001);
    placeGameText(titleText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2 - 20, 0.5, 0.5);

    const collected = addGameText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2 + 24,
      `Collected: ${this.sim.hud().collected}`,
      HUD_FONT_SIZE,
    ).setDepth(1001);
    placeGameText(collected, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2 + 24, 0.5, 0.5);
    addSeedLabel(this, this.sim.random.seed).setDepth(1001);
  }

  private refreshLivesIcons(pulseNewIcon: boolean): void {
    for (const icon of this.lifeIcons) {
      icon.destroy();
    }
    this.lifeIcons = [];
    const size = playerDisplaySize();
    const y = this.hudIconY();
    for (let i = 0; i < livesHudIconCount(this.sim.hud().lives); i += 1) {
      const x = HUD_ICON_LEFT_X + size / 2 + i * (size + HUD_ICON_GAP);
      const icon = addDotManIcon(this, x, y, size, loadGhostStyle());
      this.sideHud.add(icon);
      this.lifeIcons.push(icon);
    }
    if (pulseNewIcon && this.lifeIcons.length > 0) {
      this.pulseHudIcon(this.lifeIcons[this.lifeIcons.length - 1]);
    }
    this.refreshShieldIcons();
  }

  private refreshShieldIcons(): void {
    for (const icon of this.shieldIcons) {
      icon.destroy();
    }
    this.shieldIcons = [];
    const lifeSize = playerDisplaySize();
    const size = lifeSize * SHIELD_HUD_SIZE_FRAC;
    const y = this.hudIconY();
    const lifeIconCount = livesHudIconCount(this.sim.hud().lives);
    for (let i = 0; i < this.sim.hud().shields; i += 1) {
      const x = shieldHudIconX(lifeIconCount, i, lifeSize);
      const icon = this.add.rectangle(x, y, size, size, SHIELD_HUD_COLOR);
      this.sideHud.add(icon);
      this.shieldIcons.push(icon);
    }
  }

  private drawShieldCrack(index: number, progress: number): void {
    const lifeSize = playerDisplaySize();
    const size = lifeSize * SHIELD_HUD_SIZE_FRAC;
    if (this.shieldCrackHalves.length === 0) {
      this.shieldCrackHalves = [0, 1].map(() => {
        const half = this.add.rectangle(0, 0, size / 2, size, SHIELD_HUD_COLOR);
        this.sideHud.add(half);
        return half;
      });
    }
    if (progress >= 1) {
      for (const half of this.shieldCrackHalves) {
        half.destroy();
      }
      this.shieldCrackHalves = [];
      return;
    }
    const look = shieldCrackLook(progress);
    const cx = shieldHudIconX(livesHudIconCount(this.sim.hud().lives), index, lifeSize);
    const y = this.hudIconY() + look.dropY;
    for (const [i, half] of this.shieldCrackHalves.entries()) {
      const side = i * 2 - 1;
      half
        .setPosition(cx + side * (size / 4 + look.offsetX), y)
        .setRotation(side * look.rotation)
        .setAlpha(look.alpha);
    }
  }

  private hudIconY(): number {
    return PLAYFIELD_HEIGHT - 8 - playerDisplaySize() / 2;
  }

  private pulseHudIcon(icon: Phaser.GameObjects.Image): void {
    const baseScale = icon.scaleX;
    this.tweens.add({
      targets: icon,
      scale: baseScale * 1.4,
      duration: 160,
      ease: "Sine.easeOut",
      yoyo: true,
    });
  }

  private refreshQuartersHud(pulse: boolean): void {
    for (const icon of this.quarterIcons) {
      icon.destroy();
    }
    this.quarterIcons = [];
    const size = pelletDisplaySize();
    for (let i = 0; i < this.sim.hud().quarters; i += 1) {
      const { x, y } = quarterHudIconPosition(i, size);
      const icon = this.add.image(x, y, QUARTER_TEXTURE_KEY).setDisplaySize(size, size);
      this.sideHud.add(icon);
      this.quarterIcons.push(icon);
    }
    const newest = this.quarterIcons[this.quarterIcons.length - 1];
    if (pulse && newest !== undefined) {
      this.pulseHudIcon(newest);
    }
  }

  private drawWalletCoins(spend: MoneyTalksSpend | null): void {
    const count = spend?.count ?? 0;
    while (this.walletCoins.length < count) {
      this.walletCoins.push(this.add.image(0, 0, QUARTER_TEXTURE_KEY).setDepth(WALLET_COIN_DEPTH));
    }
    const size = pelletDisplaySize();
    this.walletCoins.forEach((coin, i) => {
      const look =
        spend === null || i >= count
          ? null
          : moneyTalksCoinLook(spend.elapsedMs, i, count, spend.quartersBefore, size);
      coin.setVisible(look !== null);
      if (look !== null) {
        coin.setPosition(look.x, look.y).setDisplaySize(look.size, look.size).setAlpha(look.alpha);
      }
    });
  }

  private applyBonusFx(tier: number, filled: number): void {
    if (tier > 0) {
      const fx = bonusBumpFx(tier);
      this.barFx = bumpBarFx(this.barFx, fx);
      if (fx.kind === "punch" && fx.chromeShake) {
        this.shakeChrome();
      }
    }
    if (filled > 0) {
      this.barFx = fillBarFx(this.barFx, filled);
      const newest = this.quarterIcons[this.quarterIcons.length - 1];
      if (newest !== undefined) {
        this.pulseHudIcon(newest);
      }
      playSfx(this, "pelletMunch");
      playSfx(this, "pelletMunch2");
    }
  }

  private shakeChrome(): void {
    this.chromeShake?.remove();
    let step = 0;
    const [x, y] = CHROME_SHAKE_OFFSETS[0]!;
    this.chrome.setPosition(x, y);
    this.chromeShake = this.time.addEvent({
      delay: CHROME_SHAKE_STEP_MS,
      repeat: CHROME_SHAKE_OFFSETS.length - 2,
      callback: () => {
        step += 1;
        const [nextX, nextY] = CHROME_SHAKE_OFFSETS[step] ?? [0, 0];
        this.chrome.setPosition(nextX, nextY);
      },
    });
  }

  private drawBonusBar(): void {
    this.bonusGfx.clear();
    if (this.ghostStyle === "pixel") {
      this.bonusGlowGfx.clear();
      this.bonusGlowGfx.setVisible(false);
      this.bonusGlowGfx.filters?.internal.clear();
      this.bonusGlowKey = "";
      for (const rect of barRects(this.barFx, "pixel")) {
        this.bonusGfx.fillStyle(rect.color, 1);
        this.bonusGfx.fillRect(
          rect.x * BONUS_ART_SCALE,
          rect.y * BONUS_ART_SCALE,
          rect.w * BONUS_ART_SCALE,
          rect.h * BONUS_ART_SCALE,
        );
      }
      return;
    }
    const tube = neonBarTube(this.barFx);
    this.paintNeonTube(this.bonusGfx, tube, false);
    this.syncBonusBarGlow(tube);
  }

  private paintNeonTube(
    gfx: Phaser.GameObjects.Graphics,
    tube: NeonBarTube,
    forGlow: boolean,
  ): void {
    const s = BONUS_ART_SCALE;
    const x = tube.x * s;
    const y = tube.y * s;
    const w = tube.w * s;
    const h = tube.h * s;
    const radius = h / 2;
    const inset = BONUS_TUBE_INSET;
    const innerX = x + inset;
    const innerY = y + inset;
    const innerH = h - inset * 2;
    const innerW = w - inset * 2;
    const innerR = innerH / 2;
    if (forGlow) {
      gfx.lineStyle(BONUS_TUBE_STROKE + 1, BONUS_COLORS.fill, 1);
      gfx.strokeRoundedRect(x, y, w, h, radius);
      if (tube.fillFrac > 0) {
        const fillW = Math.min(innerW, Math.max(innerH, tube.fillFrac * innerW));
        gfx.fillStyle(BONUS_COLORS.fill, 1);
        gfx.fillRoundedRect(innerX, innerY, fillW, innerH, innerR);
      }
      return;
    }
    gfx.fillStyle(tube.trackColor, BONUS_TRACK_ALPHA);
    gfx.fillRoundedRect(x, y, w, h, radius);
    gfx.lineStyle(BONUS_TUBE_STROKE, tube.frameColor, 1);
    gfx.strokeRoundedRect(x, y, w, h, radius);
    if (tube.fillFrac <= 0) {
      return;
    }
    const fillW = Math.min(innerW, Math.max(innerH, tube.fillFrac * innerW));
    gfx.fillStyle(tube.fillColor, 1);
    gfx.fillRoundedRect(innerX, innerY, fillW, innerH, innerR);
    const coreH = Math.max(2, Math.round(innerH * 0.35));
    const coreY = innerY + (innerH - coreH) / 2;
    const corePad = innerR * 0.45;
    const coreW = Math.max(0, fillW - corePad * 2);
    if (coreW > 0) {
      gfx.fillStyle(tube.coreColor, 0.95);
      gfx.fillRoundedRect(innerX + corePad, coreY, coreW, coreH, coreH / 2);
    }
  }

  private syncBonusBarGlow(tube: NeonBarTube): void {
    const glow = bonusBarGlowFilter(this.ghostStyle);
    const px = renderScaleOf(this);
    this.bonusGlowGfx.setPosition(this.chrome.x + BONUS_BAR_X, this.chrome.y + BONUS_BAR_Y);
    if (glow === null) {
      this.bonusGlowGfx.clear();
      this.bonusGlowGfx.setVisible(false);
      this.bonusGlowGfx.filters?.internal.clear();
      this.bonusGlowKey = `off:${px}`;
      return;
    }
    this.bonusGlowGfx.setVisible(true);
    const key = `on:${px}:${glow.outerStrength}:${glow.distance}`;
    if (this.bonusGlowKey !== key) {
      this.bonusGlowKey = key;
      try {
        const reach = Math.ceil(glow.distance * px);
        const pad = BONUS_GLOW_PAD_WORLD;
        const filterW = Math.ceil((BONUS_BAR_ART_W * BONUS_ART_SCALE + 2 * pad) * px) + 2 * reach;
        const filterH = Math.ceil((BONUS_BAR_ART_H * BONUS_ART_SCALE + 2 * pad) * px) + 2 * reach;
        this.bonusGlowGfx.enableFilters();
        this.bonusGlowGfx.filtersAutoFocus = false;
        this.bonusGlowGfx.filtersFocusContext = false;
        this.bonusGlowGfx.setFilterSize(filterW, filterH);
        this.bonusGlowGfx.filterCamera.setZoom(px);
        this.bonusGlowGfx.filterCamera.centerOn(
          (BONUS_BAR_ART_W * BONUS_ART_SCALE) / 2,
          (BONUS_BAR_ART_H * BONUS_ART_SCALE) / 2,
        );
        this.bonusGlowGfx.filters!.internal.clear();
        this.bonusGlowGfx.filters!.internal.addGlow(
          BONUS_COLORS.fill,
          glow.outerStrength,
          0,
          1,
          true,
          BONUS_GLOW_QUALITY,
          reach,
        );
      } catch {
        this.bonusGlowKey = "";
        this.bonusGlowGfx.clear();
        this.bonusGlowGfx.setVisible(false);
        return;
      }
    }
    this.bonusGlowGfx.clear();
    this.paintNeonTube(this.bonusGlowGfx, tube, true);
  }

  private refreshUpgradesHud(): void {
    const owned = this.sim.hud().upgrades;
    const labels = upgradeLabels(owned);
    this.upgradeLines.forEach((line) => line.destroy());
    this.upgradeLines = labels.map((label, i) => {
      const line = addGameText(
        this,
        12,
        0,
        label,
        UPGRADES_HUD_FONT_SIZE,
        SCHOOL_COLORS[getUpgradeDef(owned[i]).school],
      );
      this.sideHud.add(line);
      return line;
    });
    const first = this.upgradeLines[0];
    if (first === undefined) {
      return;
    }
    const lineHeight = first.getTextBounds(true).local.height;
    const top = PLAYFIELD_HEIGHT / 2 - (lineHeight * labels.length) / 2;
    this.upgradeLines.forEach((line, i) => placeGameText(line, 12, top + lineHeight * i));
  }

  private timerLabel(): string {
    return `Time: ${this.sim.hud().time}`;
  }
}
