import Phaser from "phaser";
import { DEATH_FADE_DURATION_MS } from "../../domain/deathSequence";
import { livesHudIconCount } from "../../domain/lives";
import { pelletDisplaySize, playerDisplaySize } from "../../domain/maze";
import { parsePlayOptions } from "../../domain/playOptions";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { freshSeed } from "../../domain/runRandom";
import { withSeenCorruption, withSeenGhosts, withSeenUpgrade } from "../../domain/seenRecord";
import { upgradeLabels } from "../../domain/upgrades";
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
import type { SimEvent } from "../sim/simEvents";
import { saveRun } from "../storage/runHistoryStorage";
import { loadSeenRecord, saveSeenRecord } from "../storage/seenRecordStorage";
import type { HeldKeys } from "../systems/heldKeys";
import { createHeldKeysReader } from "../systems/playerInput";
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
import { addSeedLabel } from "./seedLabel";
import { createStartingUpgradeCard, type StartingUpgradeCard } from "./startingUpgradeCard";
import { createStoreOverlay, type StoreOverlay } from "./storeOverlay";
import { createUpgradeChoiceModal, type UpgradeChoiceModal } from "./upgradeChoiceModal";

const LEVEL_BANNER_FADE_MS = 1500;
const BOSS_BANNER_SLAM_MS = 220;
const BOSS_BANNER_HOLD_MS = 1200;
const BOSS_BANNER_FADE_MS = 800;
const BOSS_BANNER_START_SCALE = 3;
const BOSS_BANNER_COLOR = 0xff3b3b;
const BOSS_SHAKE_MS = 400;
const BOSS_SHAKE_INTENSITY = 0.02;

export class PlayScene extends Phaser.Scene {
  private sim!: PlaySim;
  private readHeldKeys!: () => HeldKeys;
  private playRender!: PlayRender;
  private storeOverlay: StoreOverlay | null = null;
  private quarterIcons: Phaser.GameObjects.Image[] = [];
  private timerText!: Phaser.GameObjects.BitmapText;
  private upgradesText!: Phaser.GameObjects.BitmapText;
  private levelBannerText: Phaser.GameObjects.BitmapText | null = null;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private upgradeChoiceModal!: UpgradeChoiceModal;
  private startingUpgradeCard!: StartingUpgradeCard;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private storeToggleKeys: Phaser.Input.Keyboard.Key[] = [];
  private storeConfirmKeys: Phaser.Input.Keyboard.Key[] = [];
  private musicPendingFanfareEnd: SfxId | null = null;

  constructor() {
    super("PlayScene");
  }

  preload(): void {
    preloadPlayArt(this);
    preloadSfx(this);
  }

  create(): void {
    stopLoopingSfx(this, "menuMusic");
    this.clearLevelBanner();

    const { options, warnings } = parsePlayOptions(new URLSearchParams(location.search));
    for (const warning of warnings) {
      console.warn(warning);
    }
    this.sim = new PlaySim(options, options.seed ?? freshSeed());

    this.upgradeChoiceModal?.destroy();
    this.upgradeChoiceModal = createUpgradeChoiceModal(this, this.sim.random.stream("upgradeFx"));
    this.startingUpgradeCard?.destroy();
    this.startingUpgradeCard = createStartingUpgradeCard(this);
    this.closeStoreUi();

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
    this.playRender = createRender(this);

    this.applyEvents(this.sim.start(), 0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      stopLoopingSfx(this, "gameplayMusic");
      stopLoopingSfx(this, "death");
      stopLoopingSfx(this, "revive");
      this.upgradeChoiceModal.destroy();
      this.startingUpgradeCard.destroy();
      this.closeStoreUi();
      this.clearLevelBanner();
    });
  }

  update(_time: number, delta: number): void {
    if (this.musicPendingFanfareEnd !== null && !isSfxPlaying(this, "levelComplete")) {
      startLoopingSfx(this, this.musicPendingFanfareEnd);
      this.musicPendingFanfareEnd = null;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
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
      },
      delta,
    );
    this.applyEvents(events, delta);
  }

  public runSeed(): string {
    return this.sim.random.seed;
  }

  public currentMusicId(): SfxId {
    return this.sim.storeState() !== null ? "storeMusic" : "gameplayMusic";
  }

  public debugSnapshot() {
    return {
      ...this.sim.snapshot(),
      startingUpgradeCardOpen: this.startingUpgradeCard.isActive(),
      upgradeModalOpen: this.upgradeChoiceModal.isActive(),
      upgradeOffer: this.upgradeChoiceModal.offer()?.upgrades ?? null,
    };
  }

  public resumeFromPauseMenu(): void {
    this.sim.suppressInputUntilRelease();
    if (this.upgradeChoiceModal.isActive()) {
      this.upgradeChoiceModal.rearmSelectionKeys();
    }
    this.scene.resume();
  }

  private pauseForMenu(): void {
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
        this.refreshQuartersHud();
        break;
      case "upgrades":
        this.refreshUpgradesHud();
        break;
      case "timer":
        this.timerText.setText(this.timerLabel());
        placePixelText(this.timerText, PLAYFIELD_WIDTH - 12, 8, 1, 0);
        break;
      case "timerVisible":
        this.timerText.setVisible(event.visible);
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
        this.storeOverlay = createStoreOverlay(this);
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
        break;
      case "goToMenu":
        this.scene.start("MenuScene");
        break;
      case "saveRun":
        saveRun(event.collected, event.remaining);
        break;
      case "seenGhosts": {
        const seen = loadSeenRecord();
        const withGhosts = withSeenGhosts(seen, event.ghostKinds);
        const next =
          event.corruption !== null ? withSeenCorruption(withGhosts, event.corruption) : withGhosts;
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
    const banner = addPixelText(this, x, y, "BOSS", MENU_TITLE_FONT_SIZE * 2, BOSS_BANNER_COLOR)
      .setOrigin(0.5, 0.5)
      .setDepth(800)
      .setScale(BOSS_BANNER_START_SCALE);
    this.levelBannerText = banner;
    this.tweens.add({
      targets: banner,
      scale: 1,
      duration: BOSS_BANNER_SLAM_MS,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.shakeCamera();
        this.tweens.add({
          targets: banner,
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
    const maxX = BOSS_SHAKE_INTENSITY * camera.width;
    const maxY = BOSS_SHAKE_INTENSITY * camera.height;
    this.tweens.addCounter({
      duration: BOSS_SHAKE_MS,
      onUpdate: () => camera.setScroll((shake() * 2 - 1) * maxX, (shake() * 2 - 1) * maxY),
      onComplete: () => camera.setScroll(0, 0),
    });
  }

  private clearLevelBanner(): void {
    this.levelBannerText?.destroy();
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
    const y = PLAYFIELD_HEIGHT - 8 - size / 2;
    for (let i = 0; i < livesHudIconCount(this.sim.hud().lives); i += 1) {
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
    for (let i = 0; i < this.sim.hud().quarters; i += 1) {
      const x = 12 + size / 2 + i * (size + 4);
      const icon = this.add
        .image(x, y, QUARTER_TEXTURE_KEY)
        .setDisplaySize(size, size)
        .setDepth(10);
      this.quarterIcons.push(icon);
    }
  }

  private refreshUpgradesHud(): void {
    const labels = upgradeLabels(this.sim.hud().upgrades);
    if (labels.length === 0) {
      this.upgradesText.setVisible(false);
      return;
    }
    this.upgradesText.setVisible(true);
    this.upgradesText.setText(labels.join("\n"));
    placePixelText(this.upgradesText, 12, PLAYFIELD_HEIGHT / 2, 0, 0.5);
  }

  private timerLabel(): string {
    return `Time: ${this.sim.hud().time}`;
  }
}
