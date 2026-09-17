import Phaser from "phaser";
import {
  AUDIO_LEVEL_MAX,
  clampLevel,
  defaultAudioSettings,
  type AudioCategory,
  type AudioSettings,
} from "../../domain/audioSettings";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { playVolumePreview, preloadSfx } from "../audio/sfx";
import { loadAudioSettings, saveAudioSettings } from "../storage/audioSettingsStorage";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";

const FOCUS_BACK = 2;
const FOCUS_COUNT = 3;

const ROW_Y: Record<AudioCategory, number> = {
  music: 220,
  sfx: 320,
};
const CATEGORIES: AudioCategory[] = ["music", "sfx"];
const ROW_LABEL: Record<AudioCategory, string> = {
  music: "MUSIC",
  sfx: "SOUND EFFECTS",
};

const LABEL_X = 80;
const TOGGLE_X = 320;
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

type CategoryRow = {
  category: AudioCategory;
  focusIndex: number;
  label: Phaser.GameObjects.BitmapText;
  toggle: Phaser.GameObjects.BitmapText;
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  notches: Phaser.GameObjects.Rectangle[];
};

export class SettingsScene extends Phaser.Scene {
  private settings: AudioSettings = defaultAudioSettings();
  private focusIndex = 0;
  private moveCooldownMs = 0;
  private pendingBack = false;
  private audioDisabled = false;
  private rows: CategoryRow[] = [];
  private backText!: Phaser.GameObjects.BitmapText;
  private dragging: AudioCategory | null = null;

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

  create(): void {
    this.settings = loadAudioSettings();
    this.focusIndex = 0;
    this.moveCooldownMs = 0;
    this.pendingBack = false;
    this.dragging = null;
    this.rows = [];
    this.audioDisabled = this.game.config.audio.noAudio === true;

    const title = addPixelText(this, PLAYFIELD_WIDTH / 2, 80, "SETTINGS", MENU_TITLE_FONT_SIZE);
    placePixelText(title, PLAYFIELD_WIDTH / 2, 80, 0.5, 0.5);

    for (const [index, category] of CATEGORIES.entries()) {
      this.rows.push(this.createRow(category, index));
    }

    if (this.audioDisabled) {
      const warning = addPixelText(
        this,
        PLAYFIELD_WIDTH / 2,
        420,
        "AUDIO DISABLED",
        MENU_OPTION_FONT_SIZE,
        TEXT_COLOR_YELLOW,
      );
      placePixelText(warning, PLAYFIELD_WIDTH / 2, 420, 0.5, 0.5);
    }

    this.backText = addPixelText(
      this,
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT - 80,
      "> BACK",
      MENU_OPTION_FONT_SIZE,
      TEXT_COLOR_YELLOW,
    );
    placePixelText(this.backText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, 0.5, 0.5);
    this.backText.setInteractive({ useHandCursor: true });
    this.backText.on("pointerdown", () => {
      this.goBack();
    });

    this.input.on("pointerup", () => {
      this.dragging = null;
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.dragging === null || !pointer.isDown) {
        return;
      }
      this.setLevelFromPointer(this.dragging, pointer.x);
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

    const up =
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.keyW);
    const down =
      Phaser.Input.Keyboard.JustDown(this.cursors.down!) ||
      Phaser.Input.Keyboard.JustDown(this.keyS);
    const left =
      Phaser.Input.Keyboard.JustDown(this.cursors.left!) ||
      Phaser.Input.Keyboard.JustDown(this.keyA);
    const right =
      Phaser.Input.Keyboard.JustDown(this.cursors.right!) ||
      Phaser.Input.Keyboard.JustDown(this.keyD);

    if (this.moveCooldownMs === 0) {
      if (up) {
        this.focusIndex = (this.focusIndex + FOCUS_COUNT - 1) % FOCUS_COUNT;
        this.refreshUi();
        this.moveCooldownMs = 150;
      } else if (down) {
        this.focusIndex = (this.focusIndex + 1) % FOCUS_COUNT;
        this.refreshUi();
        this.moveCooldownMs = 150;
      } else if (left) {
        this.nudgeFocusedLevel(-1);
        this.moveCooldownMs = 120;
      } else if (right) {
        this.nudgeFocusedLevel(1);
        this.moveCooldownMs = 120;
      }
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      if (this.focusIndex === FOCUS_BACK) {
        this.pendingBack = true;
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

  private createRow(category: AudioCategory, focusIndex: number): CategoryRow {
    const centerY = ROW_Y[category];
    const label = addPixelText(this, LABEL_X, centerY, ROW_LABEL[category], MENU_OPTION_FONT_SIZE);
    const toggle = addPixelText(this, TOGGLE_X, centerY, "ON", MENU_OPTION_FONT_SIZE);
    const toggleHit = this.add
      .rectangle(TOGGLE_X + 24, centerY, 64, 28, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    toggleHit.on("pointerdown", () => {
      this.focusIndex = focusIndex;
      this.toggleCategory(category);
    });

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
      this.setLevelFromPointer(category, pointer.x);
    });

    const fill = this.add
      .rectangle(SLIDER_LEFT, centerY, 1, SLIDER_HEIGHT - 4, SLIDER_FILL)
      .setOrigin(0, 0.5);

    return { category, focusIndex, label, toggle, track, fill, notches };
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
      playVolumePreview(this, this.settings, category);
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
    this.refreshUi();
  }

  private refreshUi(): void {
    for (const row of this.rows) {
      const enabled = this.isCategoryEnabled(row.category);
      const focused = this.focusIndex === row.focusIndex;
      const tint = focused ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE;
      row.toggle.setText(enabled ? "ON" : "OFF");
      row.label.setTint(tint);
      row.toggle.setTint(tint);

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

    this.backText.setText(this.focusIndex === FOCUS_BACK ? "> BACK" : "  BACK");
    this.backText.setTint(this.focusIndex === FOCUS_BACK ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
    placePixelText(this.backText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, 0.5, 0.5);
  }

  private goBack(): void {
    this.sound.stopByKey("siren");
    this.scene.start("MenuScene");
  }
}
