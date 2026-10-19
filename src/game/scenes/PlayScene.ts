import Phaser from "phaser";
import { parseQueryParams } from "../../domain/queryParams";
import {
  barRects,
  BONUS_ART_SCALE,
  BONUS_BAR_ART_W,
  bonusBumpFx,
  bumpBarFx,
  createBarFx,
  fillBarFx,
  slowFillBarFx,
  stepBarFx,
  type BarFxState,
} from "../../domain/bonusBarFx";
import { playTurnSparks } from "./turnSparks";
import { playChaffBurst } from "./chaffBurst";
import { createPowerPelletBreakFx, type PowerPelletBreakFx } from "./powerPelletBreakFx";
import { stepMusicDuck } from "../../domain/slotMachine";
import { bossTimerLabel } from "../../domain/bossRules";
import { DEATH_FADE_DURATION_MS } from "../../domain/deathSequence";
import { livesHudIconCount } from "../../domain/lives";
import {
  MAZE_OFFSET_X,
  MAZE_OFFSET_Y,
  MAZE_PIXEL_HEIGHT,
  pelletDisplaySize,
  playerDisplaySize,
} from "../../domain/maze";
import type { IntermissionFrame } from "../../domain/intermission";
import { wallStyleFor } from "../../domain/wallStyle";
import { DEFAULT_TUNING, type Tuning } from "../../domain/tuning";
import {
  moneyTalksCoinLook,
  quarterHudIconPosition,
  quarterHudIcons,
} from "../../domain/moneyTalks";
import { loadCustomMaze } from "../storage/customMazeStorage";
import { parsePlayOptions } from "../../domain/playOptions";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { mintFreshSeed } from "../../domain/ghostRoster";
import { withSeenGhosts, withSeenUpgrade } from "../../domain/seenRecord";
import { getUpgradeDef, upgradeLabels, type UpgradeId } from "../../domain/upgrades";
import {
  isSfxPlaying,
  playPelletCollectSfx,
  playSfx,
  preloadSfx,
  setMusicDuck,
  startLoopingSfx,
  stopLoopingSfx,
  type SfxId,
} from "../audio/sfx";
import { PlaySim } from "../sim/playSim";
import type { MoneyTalksSpend, SimEvent } from "../sim/simEvents";
import { clearDebugTuning, loadDebugTuning, saveDebugTuning } from "../storage/debugTuningStorage";
import { loadLastRoster, saveLastRoster } from "../storage/lastRosterStorage";
import { saveRun } from "../storage/runHistoryStorage";
import { drainRunUploads } from "../net/apiClient";
import { newRunLogMeta, saveRunLog } from "../storage/runLogStorage";
import { loadSeenRecord, saveSeenRecord } from "../storage/seenRecordStorage";
import type { HeldKeys } from "../systems/heldKeys";
import { createHeldKeysReader } from "../systems/playerInput";
import {
  addDotManIcon,
  addDollarIcon,
  addQuarterIcon,
  createRender,
  preloadPlayArt,
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
import { upgradeStackHeight, upgradeStackRowPitch } from "../../domain/textLayout";
import { createKnobsPanel, type KnobsPanel } from "./knobsPanel";
import { createIntermissionActors, type IntermissionActors } from "./intermissionActors";
import { createRunEndMenu, type RunEndMenu } from "./runEndMenu";
import { addSeedLabel } from "./seedLabel";
import { createStartingUpgradeCard, type StartingUpgradeCard } from "./startingUpgradeCard";
import { playStreakPop } from "./streakPop";
import { createSlotOverlay, type SlotOverlay } from "./slotOverlay";
import type { StoreDir } from "../../domain/store";
import { createStoreOverlay, type StoreOverlay } from "./storeOverlay";
import {
  createUpgradeChoiceModal,
  SCHOOL_COLORS,
  type UpgradeChoiceModal,
} from "./upgradeChoiceModal";
import { applyRenderScale } from "../renderScale";

const HUD_ICON_LEFT_X = 12;
const HUD_ICON_GAP = 4;
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
  private storeDir: StoreDir | null = null;
  private storePointer: { x: number; y: number } | null = null;
  private pointerOverStoreExit = false;
  private chrome!: Phaser.GameObjects.Container;
  private sideHud!: Phaser.GameObjects.Container;
  private knobsPanel: KnobsPanel | null = null;
  private chromeShake: Phaser.Time.TimerEvent | null = null;
  private bonusGfx!: Phaser.GameObjects.Graphics;
  private barFx!: BarFxState;
  private quarterIcons: Phaser.GameObjects.Image[] = [];
  private walletCoins: Phaser.GameObjects.Image[] = [];
  private timerText!: Phaser.GameObjects.BitmapText;
  private upgradeLines: Phaser.GameObjects.BitmapText[] = [];
  private levelBannerText: Phaser.GameObjects.BitmapText | null = null;
  private lifeIcons: Phaser.GameObjects.Container[] = [];
  private powerPelletBreakFx!: PowerPelletBreakFx;
  private upgradeChoiceModal!: UpgradeChoiceModal;
  private slotOverlay!: SlotOverlay;
  private musicDuck = 1;
  private musicDuckApplied = 1;
  private keyPressed = false;
  private startingUpgradeCard!: StartingUpgradeCard;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private storeYesKeys: Phaser.Input.Keyboard.Key[] = [];
  private storeNoKeys: Phaser.Input.Keyboard.Key[] = [];
  private storeLeftKeys: Phaser.Input.Keyboard.Key[] = [];
  private storeRightKeys: Phaser.Input.Keyboard.Key[] = [];
  private storeConfirmKeys: Phaser.Input.Keyboard.Key[] = [];
  private musicPendingFanfareEnd: SfxId | null = null;
  private runEndMenu: RunEndMenu | null = null;
  private intermission: IntermissionActors | null = null;
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

    const params = parseQueryParams(location.search);
    const { options, warnings } = parsePlayOptions(params);
    for (const warning of warnings) {
      console.warn(warning);
    }
    this.sys.settings.data = {};
    if (params.has("customMaze")) {
      options.mazeAscii = loadCustomMaze();
    }
    if (data.restartLevel !== undefined) {
      options.level = data.restartLevel;
      options.jumpToUpgrade = false;
      options.jumpToSpinner = false;
      options.store = null;
    }
    const tuning = options.knobs ? loadDebugTuning() : DEFAULT_TUNING;
    const runLogMeta = newRunLogMeta(params);
    const seed =
      data.seed ?? options.seed ?? mintFreshSeed(options.roster === null ? loadLastRoster() : null);
    this.sim = new PlaySim(options, seed, tuning, runLogMeta);
    saveLastRoster(this.sim.currentRoster());
    this.pausedAtMs = null;
    this.hiddenAtMs = null;

    this.upgradeChoiceModal?.destroy();
    this.upgradeChoiceModal = createUpgradeChoiceModal(this, this.sim.random.stream("upgradeFx"));
    this.startingUpgradeCard?.destroy();
    this.startingUpgradeCard = createStartingUpgradeCard(this);
    this.slotOverlay = createSlotOverlay(this);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.repeat && event.key !== "Escape") {
        this.keyPressed = true;
      }
    };
    this.input.keyboard?.on("keydown", onKeyDown);
    this.closeStoreUi();
    this.runEndMenu = null;
    this.intermission = null;

    this.chrome = this.add.container(0, 0).setDepth(10);
    this.sideHud = this.add.container(0, 0).setVisible(!options.knobs);
    this.chrome.add(this.sideHud);
    this.chromeShake = null;
    this.timerText = addPixelText(this, PLAYFIELD_WIDTH - 12, 8, this.timerLabel(), HUD_FONT_SIZE);
    placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);

    this.upgradeLines = [];

    const bonusLabel = addPixelText(this, 0, 0, "BONUS", HUD_FONT_SIZE);
    placePixelText(bonusLabel, BONUS_BAR_X - BONUS_LABEL_GAP, BONUS_BAR_Y, 1, 0);
    this.bonusGfx = this.add.graphics({ x: BONUS_BAR_X, y: BONUS_BAR_Y });
    this.barFx = createBarFx(this.sim.hud().bonusCharge);
    this.sideHud.add(this.timerText);
    this.chrome.add([bonusLabel, this.bonusGfx]);
    this.lifeIcons = [];
    this.powerPelletBreakFx?.clear();
    this.powerPelletBreakFx = createPowerPelletBreakFx(this);
    this.quarterIcons = [];
    this.walletCoins = [];
    this.refreshQuartersHud(false);

    this.readHeldKeys = createHeldKeysReader(this);
    this.musicPendingFanfareEnd = null;
    this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.storeYesKeys = [KeyCodes.UP, KeyCodes.W].map((code) => this.input.keyboard!.addKey(code));
    this.storeNoKeys = [KeyCodes.DOWN, KeyCodes.S].map((code) => this.input.keyboard!.addKey(code));
    this.storeLeftKeys = [KeyCodes.LEFT, KeyCodes.A].map((code) =>
      this.input.keyboard!.addKey(code),
    );
    this.storeRightKeys = [KeyCodes.RIGHT, KeyCodes.D].map((code) =>
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
      this.input.keyboard?.off("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      this.applyEvents(this.sim.finishRun("quit"), 0);
      stopLoopingSfx(this, "gameplayMusic");
      stopLoopingSfx(this, "interstitialMusic");
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
    this.playRender.setDotManLook({ chompSpeed: tuning.dotManChompSpeed });
    this.playRender.setCharmTuning(tuning);
  }

  private rebuildStoreOverlayIfOpen(): void {
    const state = this.sim.storeState();
    if (this.storeOverlay === null || state === null) {
      return;
    }
    this.storeOverlay.destroy();
    this.storeOverlay = this.createStoreOverlay();
    this.storeOverlay.open(state);
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
    const keyDir = readsStoreKeys ? this.storeDirPressed() : null;
    const storeDir = keyDir ?? (readsStoreKeys ? this.storeDir : null);
    const events = this.sim.step(
      {
        keys: this.readHeldKeys(),
        uiOpen: this.startingUpgradeCard.isActive() || this.upgradeChoiceModal.isActive(),
        storeFocus: keyDir === "up" ? "yes" : keyDir === "down" ? "no" : null,
        storeDir,
        storeConfirm:
          readsStoreKeys &&
          this.storeConfirmKeys.some((key) => Phaser.Input.Keyboard.JustDown(key)),
        storeChoice: readsStoreKeys ? this.storeChoice : null,
        storeClick: readsStoreKeys ? this.storeClick : null,
        storePointer: readsStoreKeys ? this.storePointer : null,
        storeCancelRoute: escDown,
        acknowledge: this.keyPressed,
      },
      delta,
    );
    this.keyPressed = false;
    this.storeChoice = null;
    this.storeClick = null;
    this.storeDir = null;
    this.storePointer = null;
    this.applyEvents(events, delta);
    const slotView = this.sim.slotView();
    this.slotOverlay.sync(slotView);
    this.musicDuck = stepMusicDuck(this.musicDuck, slotView !== null, delta);
    if (this.musicDuck !== 1 || this.musicDuckApplied !== 1) {
      setMusicDuck(this, "gameplayMusic", this.musicDuck);
      this.musicDuckApplied = this.musicDuck;
    }
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
    if (this.sim.intermissionActive()) {
      return "interstitialMusic";
    }
    return this.sim.storeState() !== null ? "storeMusic" : "gameplayMusic";
  }

  public debugSnapshot() {
    return {
      ...this.sim.snapshot(),
      playerSpriteRotation: this.playRender.playerSpriteRotation(),
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
    this.keyPressed = false;
    const timerVisible = this.timerText.visible;
    this.timerText.destroy();
    this.timerText = addPixelText(this, PLAYFIELD_WIDTH - 12, 8, this.timerLabel(), HUD_FONT_SIZE);
    placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);
    this.timerText.setVisible(timerVisible);
    this.sideHud.add(this.timerText);
    if (this.upgradeChoiceModal.isActive()) {
      this.upgradeChoiceModal.rearmSelectionKeys();
    }
    this.refreshUpgradesHud();
    this.refreshLivesIcons(false);
    this.refreshQuartersHud(false);
    for (const coin of this.walletCoins) {
      coin.destroy();
    }
    this.walletCoins = [];
    this.rebuildStoreOverlayIfOpen();
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
        this.powerPelletBreakFx.clear();
        break;
      case "draw":
        this.playRender.draw(this.sim.world, event.options);
        break;
      case "bouncePowerPellet":
        this.playRender.bouncePowerPellet(event.eid);
        break;
      case "powerPelletBreak":
        this.powerPelletBreakFx.apply(event);
        break;
      case "chaffBurst":
        playChaffBurst(this, event);
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
      case "intermission":
        this.applyIntermission(event.frame);
        break;
      case "lives":
        this.refreshLivesIcons(event.pulse);
        break;
      case "quarters":
        this.refreshQuartersHud(event.pulse);
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
        placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);
        this.syncTimerGlitchBlink();
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
      case "startingNotice":
        this.startingUpgradeCard.openNotice(event.title, event.body);
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
        this.storeOverlay = this.createStoreOverlay();
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
        if (event.record.outcome !== "inProgress") {
          void drainRunUploads();
        }
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

  private applyIntermission(frame: IntermissionFrame | null): void {
    if (frame === null) {
      this.intermission?.destroy();
      this.intermission = null;
    } else {
      this.intermission ??= createIntermissionActors(this);
      this.intermission.place(frame);
    }
    this.upgradeLines.forEach((line) => line.setVisible(frame === null));
  }

  private storeDirPressed(): StoreDir | null {
    const pressed = (keys: Phaser.Input.Keyboard.Key[]) =>
      keys.filter((key) => Phaser.Input.Keyboard.JustDown(key)).length > 0;
    const up = pressed(this.storeYesKeys);
    const down = pressed(this.storeNoKeys);
    const left = pressed(this.storeLeftKeys);
    const right = pressed(this.storeRightKeys);
    return up ? "up" : down ? "down" : left ? "left" : right ? "right" : null;
  }

  private createStoreOverlay(): StoreOverlay {
    return createStoreOverlay(
      this,
      (choice) => {
        this.storeChoice = choice;
      },
      (index) => {
        this.storeClick = index;
      },
      (dir) => {
        this.storeDir = dir;
      },
    );
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
    const banner = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      text,
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

  private showBossBanner(): void {
    this.clearLevelBanner();
    const x = PLAYFIELD_WIDTH / 2;
    const y = PLAYFIELD_HEIGHT / 2;
    const banner = addPixelText(this, 0, 0, "BOSS", MENU_TITLE_FONT_SIZE * 2, BOSS_BANNER_COLOR);
    placePixelText(banner, 0, 0, 0.5, 0.5);
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
      `Collected: ${this.sim.hud().collected}`,
      HUD_FONT_SIZE,
    ).setDepth(1001);
    placePixelText(collected, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT / 2 + 24, 0.5, 0.5);
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
      const icon = addDotManIcon(this, x, y, size);
      this.sideHud.add(icon);
      this.lifeIcons.push(icon);
    }
    if (pulseNewIcon && this.lifeIcons.length > 0) {
      this.pulseHudIcon(this.lifeIcons[this.lifeIcons.length - 1]);
    }
  }

  private hudIconY(): number {
    return PLAYFIELD_HEIGHT - 8 - playerDisplaySize() / 2;
  }

  private pulseHudIcon(icon: Phaser.GameObjects.Image | Phaser.GameObjects.Container): void {
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
    // Knobs panels cover the left gutter — park icons at the maze column so they stay visible.
    const left = this.knobsPanel !== null ? MAZE_OFFSET_X + 4 : undefined;
    quarterHudIcons(this.sim.hud().quarters).forEach((kind, slot) => {
      const { x, y } = quarterHudIconPosition(slot, size, left);
      // Stay on chrome (not sideHud) so they remain visible with ?knobs=1.
      const icon = (kind === "dollar" ? addDollarIcon : addQuarterIcon)(this, x, y, size);
      this.chrome.add(icon);
      this.quarterIcons.push(icon);
    });
    const newest = this.quarterIcons[this.quarterIcons.length - 1];
    if (pulse && newest !== undefined) {
      this.pulseHudIcon(newest);
    }
  }

  private drawWalletCoins(spend: MoneyTalksSpend | null): void {
    const count = spend?.count ?? 0;
    while (this.walletCoins.length < count) {
      this.walletCoins.push(
        addQuarterIcon(this, 0, 0, pelletDisplaySize()).setDepth(WALLET_COIN_DEPTH),
      );
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
    for (const rect of barRects(this.barFx)) {
      this.bonusGfx.fillStyle(rect.color, 1);
      this.bonusGfx.fillRect(
        rect.x * BONUS_ART_SCALE,
        rect.y * BONUS_ART_SCALE,
        rect.w * BONUS_ART_SCALE,
        rect.h * BONUS_ART_SCALE,
      );
    }
  }

  private refreshUpgradesHud(): void {
    const owned = this.sim.hud().upgrades;
    const labels = upgradeLabels(owned);
    this.upgradeLines.forEach((line) => line.destroy());
    this.upgradeLines = labels.map((label, i) => {
      const line = addPixelText(
        this,
        12,
        0,
        label,
        UPGRADES_HUD_FONT_SIZE,
        SCHOOL_COLORS[getUpgradeDef(owned[i]).school],
      );
      line.setVisible(this.intermission === null);
      this.sideHud.add(line);
      return line;
    });
    const first = this.upgradeLines[0];
    if (first === undefined) {
      return;
    }
    const lineHeight = first.getTextBounds(true).local.height;
    const pitch = upgradeStackRowPitch(lineHeight);
    const top = PLAYFIELD_HEIGHT / 2 - upgradeStackHeight(labels.length, lineHeight) / 2;
    this.upgradeLines.forEach((line, i) => placePixelText(line, 12, top + pitch * i));
  }

  private timerLabel(): string {
    return bossTimerLabel(this.sim.snapshot().bossStageTransition === true, this.sim.hud().time);
  }

  private syncTimerGlitchBlink(): void {
    if (this.sim.snapshot().bossStageTransition !== true) {
      this.timerText.setAlpha(1);
      return;
    }
    const pulse = Math.floor(this.time.now / 120) % 2 === 0 ? 1 : 0.2;
    this.timerText.setAlpha(pulse);
  }
}
