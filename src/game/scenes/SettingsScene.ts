import Phaser from "phaser";
import {
  AUDIO_LEVEL_MAX,
  clampLevel,
  defaultAudioSettings,
  type AudioCategory,
  type AudioSettings,
} from "../../domain/audioSettings";
import { DEFAULT_GHOST_STYLE, type GhostStyle } from "../../domain/ghostArt";
import { createKeyRepeatState, tickKeyRepeat, type KeyRepeatState } from "../../domain/keyRepeat";
import { MAZE_BACKGROUND_COLOR } from "../../domain/maze";
import {
  MAZE_COLOR_OPTIONS,
  clampMazeColorIndex,
  defaultMazeColorSettings,
  type MazeColorSettings,
} from "../../domain/mazeColorSettings";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { SETTINGS_FOCUS_COUNT, resolveSettingsFocusIndex } from "../../domain/settingsFocus";
import {
  musicIdForContext,
  playSfxPreview,
  preloadSfx,
  syncMusicPlayback,
  type SfxId,
} from "../audio/sfx";
import { loadAudioSettings, saveAudioSettings } from "../storage/audioSettingsStorage";
import { loadGhostStyle, saveGhostStyle } from "../storage/ghostStyleStorage";
import { loadMazeColorSettings, saveMazeColorSettings } from "../storage/mazeColorStorage";
import {
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";
import { addGameText, placeGameText, type GameText } from "./neonFont";
import { applyRenderScale } from "../renderScale";

const FOCUS_MAZE_COLOR = 2;
const FOCUS_GHOST_STYLE = 3;
const FOCUS_BACK = 4;
const FOCUS_COUNT = SETTINGS_FOCUS_COUNT;

type SettingsSceneData = {
  returnScene?: string;
  musicId?: SfxId;
  focusIndex?: number;
};

const ROW_Y: Record<AudioCategory, number> = {
  music: 200,
  sfx: 280,
};
const CATEGORIES: AudioCategory[] = ["music", "sfx"];
const ROW_LABEL: Record<AudioCategory, string> = {
  music: "MUSIC",
  sfx: "SOUND EFFECTS",
};

const LABEL_X = 80;
const CHECK_X = 332;
const CHECK_SIZE = 18;
const SLIDER_LEFT = 420;
const SLIDER_WIDTH = 220;
const SLIDER_HEIGHT = 16;
const NOTCH_COUNT = AUDIO_LEVEL_MAX + 1;
const TEXT_COLOR_DIM = 0x666666;
const SLIDER_TRACK = 0x444444;
const SLIDER_FILL = 0xffff00;
const SLIDER_FILL_DIM = 0x666600;
const SLIDER_NOTCH = 0xaaaaaa;
const SLIDER_NOTCH_DIM = 0x555555;

const MAZE_COLOR_ROW_Y = 360;
const MAZE_COLOR_SWATCH_START_X = SLIDER_LEFT;
const MAZE_COLOR_SWATCH_GAP = 48;
const MAZE_COLOR_SWATCH_RADIUS = 10;
const MAZE_COLOR_CURSOR_RADIUS = MAZE_COLOR_SWATCH_RADIUS + 5;
const MAZE_COLOR_ACTIVE_RADIUS = MAZE_COLOR_SWATCH_RADIUS + 2;
const GHOST_STYLE_ROW_Y = 440;
const GHOST_STYLE_OPTIONS: { style: GhostStyle; label: string; x: number }[] = [
  { style: "neon", label: "NEON", x: SLIDER_LEFT },
  { style: "lined", label: "LINED", x: SLIDER_LEFT + 120 },
  { style: "pixel", label: "PIXEL", x: SLIDER_LEFT + 240 },
];
const AUDIO_DISABLED_WARNING_Y = 500;
const BACK_Y = PLAYFIELD_HEIGHT - 50;

type CategoryRow = {
  category: AudioCategory;
  focusIndex: number;
  label: GameText;
  checkbox: Phaser.GameObjects.Rectangle;
  checkMark: Phaser.GameObjects.Rectangle;
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  notches: Phaser.GameObjects.Rectangle[];
};

export class SettingsScene extends Phaser.Scene {
  private settings: AudioSettings = defaultAudioSettings();
  private focusIndex = 0;
  private moveCooldownMs = 0;
  private upRepeat: KeyRepeatState = createKeyRepeatState();
  private downRepeat: KeyRepeatState = createKeyRepeatState();
  private pendingBack = false;
  private audioDisabled = false;
  private rows: CategoryRow[] = [];
  private backText!: GameText;
  private dragging: AudioCategory | null = null;
  private returnScene = "MenuScene";
  private musicId: SfxId = "menuMusic";

  private mazeColorSettings: MazeColorSettings = defaultMazeColorSettings();
  private mazeColorCursorIndex = 0;
  private mazeColorLabel!: GameText;
  private mazeColorCursorRing!: Phaser.GameObjects.Arc;
  private mazeColorActiveRing!: Phaser.GameObjects.Arc;

  private ghostStyle: GhostStyle = DEFAULT_GHOST_STYLE;
  private ghostStyleLabel!: GameText;
  private ghostStyleTexts: GameText[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("SettingsScene");
  }

  preload(): void {
    preloadSfx(this);
  }

  create(data?: SettingsSceneData): void {
    applyRenderScale(this);
    // Boot order (see docs/ARCHITECTURE.md) places SettingsScene below PlayScene/PauseScene,
    // so opening it from the pause menu needs an explicit bring-to-top or the paused maze
    // (still rendering underneath) shows through the opaque background below.
    this.scene.bringToTop();

    this.settings = loadAudioSettings();
    this.focusIndex = resolveSettingsFocusIndex(data?.focusIndex);
    this.moveCooldownMs = 0;
    this.upRepeat = createKeyRepeatState();
    this.downRepeat = createKeyRepeatState();
    this.pendingBack = false;
    this.dragging = null;
    this.rows = [];
    this.returnScene = data?.returnScene ?? "MenuScene";
    this.audioDisabled = this.game.config.audio.noAudio === true;
    this.musicId = data?.musicId ?? musicIdForContext(this.returnScene);
    this.sys.settings.data = {};
    syncMusicPlayback(this, this.musicId, this.settings);
    this.mazeColorSettings = loadMazeColorSettings();
    this.mazeColorCursorIndex = clampMazeColorIndex(this.mazeColorSettings.colorIndex);
    this.ghostStyle = loadGhostStyle();

    this.add.rectangle(
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      PLAYFIELD_WIDTH,
      PLAYFIELD_HEIGHT,
      MAZE_BACKGROUND_COLOR,
    );

    const title = addGameText(this, PLAYFIELD_WIDTH / 2, 80, "SETTINGS", MENU_TITLE_FONT_SIZE);
    placeGameText(title, PLAYFIELD_WIDTH / 2, 80, 0.5, 0.5);

    for (const [index, category] of CATEGORIES.entries()) {
      this.rows.push(this.createRow(category, index));
    }

    this.createMazeColorRow();
    this.createGhostStyleRow();

    if (this.audioDisabled) {
      const warning = addGameText(
        this,
        PLAYFIELD_WIDTH / 2,
        AUDIO_DISABLED_WARNING_Y,
        "AUDIO DISABLED",
        MENU_OPTION_FONT_SIZE,
        TEXT_COLOR_YELLOW,
      );
      placeGameText(warning, PLAYFIELD_WIDTH / 2, AUDIO_DISABLED_WARNING_Y, 0.5, 0.5);
    }

    this.backText = addGameText(
      this,
      PLAYFIELD_WIDTH / 2,
      BACK_Y,
      "> BACK",
      MENU_OPTION_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    );
    placeGameText(this.backText, PLAYFIELD_WIDTH / 2, BACK_Y, 0.5, 0.5);
    this.backText.setInteractive({ useHandCursor: true });
    this.backText.on("pointerdown", () => {
      this.goBack();
    });

    const endDrag = (): void => {
      this.dragging = null;
    };
    this.input.on("pointerup", endDrag);
    this.input.on("pointerupoutside", endDrag);
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.dragging === null || !pointer.isDown) {
        return;
      }
      this.setLevelFromPointer(this.dragging, pointer.worldX);
    });

    this.refreshUi();

    if (this.input.keyboard === null) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyEsc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyBackspace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
  }

  update(_time: number, delta: number): void {
    if (this.input.keyboard === null) {
      return;
    }

    this.moveCooldownMs = Math.max(0, this.moveCooldownMs - delta);

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEsc) ||
      Phaser.Input.Keyboard.JustDown(this.keyBackspace)
    ) {
      this.goBack();
      return;
    }

    const left =
      Phaser.Input.Keyboard.JustDown(this.cursors.left!) ||
      Phaser.Input.Keyboard.JustDown(this.keyA);
    const right =
      Phaser.Input.Keyboard.JustDown(this.cursors.right!) ||
      Phaser.Input.Keyboard.JustDown(this.keyD);

    if (this.tickUp(delta)) {
      this.focusIndex = (this.focusIndex + FOCUS_COUNT - 1) % FOCUS_COUNT;
      this.onFocusChanged();
      this.refreshUi();
    } else if (this.tickDown(delta)) {
      this.focusIndex = (this.focusIndex + 1) % FOCUS_COUNT;
      this.onFocusChanged();
      this.refreshUi();
    } else if (
      this.moveCooldownMs === 0 &&
      (left || right) &&
      this.focusIndex === FOCUS_MAZE_COLOR
    ) {
      this.nudgeMazeColorCursor(left ? -1 : 1);
      this.moveCooldownMs = 120;
    } else if (
      this.moveCooldownMs === 0 &&
      (left || right) &&
      this.focusIndex === FOCUS_GHOST_STYLE
    ) {
      this.nudgeGhostStyle(left ? -1 : 1);
      this.moveCooldownMs = 120;
    } else if (
      this.moveCooldownMs === 0 &&
      (left || right) &&
      this.rows[this.focusIndex] !== undefined
    ) {
      this.nudgeFocusedLevel(left ? -1 : 1);
      this.moveCooldownMs = 120;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      if (this.focusIndex === FOCUS_BACK) {
        this.pendingBack = true;
      } else if (this.focusIndex === FOCUS_MAZE_COLOR) {
        this.commitMazeColor();
      } else if (this.focusIndex === FOCUS_GHOST_STYLE) {
        this.nudgeGhostStyle(1);
      } else {
        const row = this.rows[this.focusIndex];
        if (row !== undefined) {
          this.toggleCategory(row.category);
        }
      }
    }

    if (this.pendingBack && !this.keyEnter.isDown && !this.keySpace.isDown) {
      this.goBack();
    }
  }

  private tickUp(delta: number): boolean {
    const isDown = this.cursors.up!.isDown || this.keyW.isDown;
    const justDown =
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.keyW);
    const result = tickKeyRepeat(this.upRepeat, isDown, justDown, delta);
    this.upRepeat = result.state;
    return result.fire;
  }

  private tickDown(delta: number): boolean {
    const isDown = this.cursors.down!.isDown || this.keyS.isDown;
    const justDown =
      Phaser.Input.Keyboard.JustDown(this.cursors.down!) ||
      Phaser.Input.Keyboard.JustDown(this.keyS);
    const result = tickKeyRepeat(this.downRepeat, isDown, justDown, delta);
    this.downRepeat = result.state;
    return result.fire;
  }

  private onFocusChanged(): void {
    if (this.focusIndex === FOCUS_MAZE_COLOR) {
      this.mazeColorCursorIndex = this.mazeColorSettings.colorIndex;
    }
  }

  private createRow(category: AudioCategory, focusIndex: number): CategoryRow {
    const centerY = ROW_Y[category];
    const label = addGameText(this, LABEL_X, centerY, ROW_LABEL[category], MENU_OPTION_FONT_SIZE);
    placeGameText(label, LABEL_X, centerY, 0, 0.5);

    const checkbox = this.add
      .rectangle(CHECK_X, centerY, CHECK_SIZE, CHECK_SIZE)
      .setStrokeStyle(2, TEXT_COLOR_WHITE)
      .setFillStyle(0x000000, 0);
    const checkboxHit = this.add
      .rectangle(CHECK_X, centerY, 32, 28, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    checkboxHit.on("pointerdown", () => {
      this.focusIndex = focusIndex;
      this.toggleCategory(category);
    });
    const checkMark = this.add
      .rectangle(CHECK_X, centerY, CHECK_SIZE - 8, CHECK_SIZE - 8, TEXT_COLOR_WHITE)
      .setVisible(false);

    const notches: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < NOTCH_COUNT; i += 1) {
      const x = SLIDER_LEFT + (i / AUDIO_LEVEL_MAX) * SLIDER_WIDTH;
      notches.push(this.add.rectangle(x, centerY, 2, SLIDER_HEIGHT + 6, SLIDER_NOTCH));
    }

    const track = this.add
      .rectangle(SLIDER_LEFT + SLIDER_WIDTH / 2, centerY, SLIDER_WIDTH, SLIDER_HEIGHT, SLIDER_TRACK)
      .setInteractive({ useHandCursor: true });
    track.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.focusIndex = focusIndex;
      if (!this.isCategoryEnabled(category)) {
        this.refreshUi();
        return;
      }
      this.dragging = category;
      this.setLevelFromPointer(category, pointer.worldX);
    });

    const fill = this.add
      .rectangle(SLIDER_LEFT, centerY, 1, SLIDER_HEIGHT - 4, SLIDER_FILL)
      .setOrigin(0, 0.5);

    return { category, focusIndex, label, checkbox, checkMark, track, fill, notches };
  }

  private createMazeColorRow(): void {
    const centerY = MAZE_COLOR_ROW_Y;
    this.mazeColorLabel = addGameText(this, LABEL_X, centerY, "MAZE COLOR", MENU_OPTION_FONT_SIZE);
    placeGameText(this.mazeColorLabel, LABEL_X, centerY, 0, 0.5);

    for (const [index, option] of MAZE_COLOR_OPTIONS.entries()) {
      const x = MAZE_COLOR_SWATCH_START_X + index * MAZE_COLOR_SWATCH_GAP;
      const swatch = this.add
        .circle(x, centerY, MAZE_COLOR_SWATCH_RADIUS, option.color)
        .setInteractive({ useHandCursor: true });
      swatch.on("pointerdown", () => {
        this.focusIndex = FOCUS_MAZE_COLOR;
        this.mazeColorCursorIndex = index;
        this.commitMazeColor();
      });
    }

    this.mazeColorActiveRing = this.add
      .circle(MAZE_COLOR_SWATCH_START_X, centerY, MAZE_COLOR_ACTIVE_RADIUS, 0x000000, 0)
      .setStrokeStyle(2, TEXT_COLOR_WHITE);
    this.mazeColorCursorRing = this.add
      .circle(MAZE_COLOR_SWATCH_START_X, centerY, MAZE_COLOR_CURSOR_RADIUS, 0x000000, 0)
      .setStrokeStyle(2, TEXT_COLOR_YELLOW);
  }

  private createGhostStyleRow(): void {
    const centerY = GHOST_STYLE_ROW_Y;
    this.ghostStyleLabel = addGameText(this, LABEL_X, centerY, "STYLE", MENU_OPTION_FONT_SIZE);
    placeGameText(this.ghostStyleLabel, LABEL_X, centerY, 0, 0.5);
    this.ghostStyleTexts = GHOST_STYLE_OPTIONS.map((option) => {
      const text = addGameText(this, option.x, centerY, option.label, MENU_OPTION_FONT_SIZE);
      placeGameText(text, option.x, centerY, 0, 0.5);
      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => {
        this.focusIndex = FOCUS_GHOST_STYLE;
        this.setGhostStyle(option.style);
      });
      return text;
    });
  }

  private nudgeGhostStyle(delta: number): void {
    const index = GHOST_STYLE_OPTIONS.findIndex((option) => option.style === this.ghostStyle);
    const next =
      GHOST_STYLE_OPTIONS[
        (index + delta + GHOST_STYLE_OPTIONS.length) % GHOST_STYLE_OPTIONS.length
      ]!;
    this.setGhostStyle(next.style);
  }

  private setGhostStyle(style: GhostStyle): void {
    if (style === this.ghostStyle) {
      this.refreshUi();
      return;
    }
    this.ghostStyle = style;
    saveGhostStyle(style);
    const data: SettingsSceneData = {
      returnScene: this.returnScene,
      musicId: this.musicId,
      focusIndex: this.focusIndex,
    };
    this.scene.restart(data);
  }

  public debugSnapshot(): { focusIndex: number; ghostStyle: GhostStyle } {
    return {
      focusIndex: this.focusIndex,
      ghostStyle: this.ghostStyle,
    };
  }

  private isCategoryEnabled(category: AudioCategory): boolean {
    return category === "music" ? this.settings.musicEnabled : this.settings.sfxEnabled;
  }

  private getLevel(category: AudioCategory): number {
    return category === "music" ? this.settings.musicLevel : this.settings.sfxLevel;
  }

  private setLevel(category: AudioCategory, level: number): void {
    if (!this.isCategoryEnabled(category)) {
      return;
    }
    const next = clampLevel(level);
    const prev = this.getLevel(category);
    if (category === "music") {
      this.settings = { ...this.settings, musicLevel: next };
    } else {
      this.settings = { ...this.settings, sfxLevel: next };
    }
    saveAudioSettings(this.settings);
    this.refreshUi();
    if (next !== prev && !this.audioDisabled) {
      if (category === "music") {
        syncMusicPlayback(this, this.musicId, this.settings);
      } else {
        playSfxPreview(this, this.settings);
      }
    }
  }

  private setLevelFromPointer(category: AudioCategory, pointerX: number): void {
    const ratio = (pointerX - SLIDER_LEFT) / SLIDER_WIDTH;
    this.setLevel(category, clampLevel(ratio * AUDIO_LEVEL_MAX));
  }

  private nudgeFocusedLevel(delta: number): void {
    const row = this.rows[this.focusIndex];
    if (row === undefined) {
      return;
    }
    this.setLevel(row.category, this.getLevel(row.category) + delta);
  }

  private toggleCategory(category: AudioCategory): void {
    if (category === "music") {
      this.settings = { ...this.settings, musicEnabled: !this.settings.musicEnabled };
    } else {
      this.settings = { ...this.settings, sfxEnabled: !this.settings.sfxEnabled };
    }
    saveAudioSettings(this.settings);
    if (category === "music" && !this.audioDisabled) {
      syncMusicPlayback(this, this.musicId, this.settings);
    }
    this.refreshUi();
  }

  private nudgeMazeColorCursor(delta: number): void {
    const count = MAZE_COLOR_OPTIONS.length;
    this.mazeColorCursorIndex = (this.mazeColorCursorIndex + delta + count) % count;
    this.refreshUi();
  }

  private commitMazeColor(): void {
    this.mazeColorSettings = {
      ...this.mazeColorSettings,
      colorIndex: clampMazeColorIndex(this.mazeColorCursorIndex),
    };
    saveMazeColorSettings(this.mazeColorSettings);
    this.refreshUi();
  }

  private refreshUi(): void {
    for (const row of this.rows) {
      const enabled = this.isCategoryEnabled(row.category);
      const focused = this.focusIndex === row.focusIndex;
      const tint = focused ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE;
      row.label.setTint(tint);
      row.checkbox.setStrokeStyle(2, tint);
      row.checkMark.setVisible(enabled);
      row.checkMark.setFillStyle(tint);

      const level = this.getLevel(row.category);
      const width = Math.max(0, (level / AUDIO_LEVEL_MAX) * SLIDER_WIDTH);
      row.fill.setVisible(width > 0);
      if (width > 0) {
        row.fill.setSize(width, SLIDER_HEIGHT - 4);
        row.fill.updateDisplayOrigin();
      }
      row.fill.setFillStyle(enabled ? SLIDER_FILL : SLIDER_FILL_DIM);
      row.track.setFillStyle(enabled ? SLIDER_TRACK : TEXT_COLOR_DIM);
      for (const [index, notch] of row.notches.entries()) {
        const active = index <= level;
        if (!enabled) {
          notch.setFillStyle(SLIDER_NOTCH_DIM);
        } else {
          notch.setFillStyle(active ? SLIDER_FILL : SLIDER_NOTCH);
        }
      }
    }

    const mazeColorFocused = this.focusIndex === FOCUS_MAZE_COLOR;
    this.mazeColorLabel.setTint(mazeColorFocused ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);

    const activeX =
      MAZE_COLOR_SWATCH_START_X + this.mazeColorSettings.colorIndex * MAZE_COLOR_SWATCH_GAP;
    this.mazeColorActiveRing.setPosition(activeX, MAZE_COLOR_ROW_Y);

    const cursorX = MAZE_COLOR_SWATCH_START_X + this.mazeColorCursorIndex * MAZE_COLOR_SWATCH_GAP;
    this.mazeColorCursorRing.setPosition(cursorX, MAZE_COLOR_ROW_Y);
    this.mazeColorCursorRing.setVisible(mazeColorFocused);

    const ghostStyleFocused = this.focusIndex === FOCUS_GHOST_STYLE;
    const ghostStyleTint = ghostStyleFocused ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE;
    this.ghostStyleLabel.setTint(ghostStyleTint);
    for (const [index, option] of GHOST_STYLE_OPTIONS.entries()) {
      const active = option.style === this.ghostStyle;
      this.ghostStyleTexts[index]!.setTint(active ? ghostStyleTint : TEXT_COLOR_DIM);
    }

    this.backText.setText(this.focusIndex === FOCUS_BACK ? "> BACK" : "  BACK");
    this.backText.setTint(this.focusIndex === FOCUS_BACK ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
    placeGameText(this.backText, PLAYFIELD_WIDTH / 2, BACK_Y, 0.5, 0.5);
  }

  private goBack(): void {
    this.scene.start(this.returnScene);
  }
}
