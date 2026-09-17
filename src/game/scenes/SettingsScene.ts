import Phaser from "phaser";
import { AUDIO_LEVEL_MAX, clampLevel, type AudioSettings } from "../../domain/audioSettings";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import { playMusicVolumePreview, playSfxVolumePreview, preloadSfx } from "../audio/sfx";
import { loadAudioSettings, saveAudioSettings } from "../storage/audioSettingsStorage";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";

const FOCUS_MUSIC = 0;
const FOCUS_SFX = 1;
const FOCUS_BACK = 2;
const FOCUS_COUNT = 3;

const ROW_MUSIC_Y = 220;
const ROW_SFX_Y = 320;
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

type CategoryKey = "music" | "sfx";

export class SettingsScene extends Phaser.Scene {
  private settings: AudioSettings = loadAudioSettings();
  private focusIndex = 0;
  private moveCooldownMs = 0;
  private pendingBack = false;
  private audioDisabled = false;

  private musicLabel!: Phaser.GameObjects.BitmapText;
  private musicToggle!: Phaser.GameObjects.BitmapText;
  private sfxLabel!: Phaser.GameObjects.BitmapText;
  private sfxToggle!: Phaser.GameObjects.BitmapText;
  private backText!: Phaser.GameObjects.BitmapText;

  private musicTrack!: Phaser.GameObjects.Rectangle;
  private musicFill!: Phaser.GameObjects.Rectangle;
  private musicNotches: Phaser.GameObjects.Rectangle[] = [];
  private sfxTrack!: Phaser.GameObjects.Rectangle;
  private sfxFill!: Phaser.GameObjects.Rectangle;
  private sfxNotches: Phaser.GameObjects.Rectangle[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;

  private dragging: CategoryKey | null = null;

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
    this.audioDisabled = this.game.config.audio.noAudio === true;

    const title = addPixelText(this, PLAYFIELD_WIDTH / 2, 80, "SETTINGS", MENU_TITLE_FONT_SIZE);
    placePixelText(title, PLAYFIELD_WIDTH / 2, 80, 0.5, 0.5);

    this.musicLabel = addPixelText(this, LABEL_X, ROW_MUSIC_Y, "MUSIC", MENU_OPTION_FONT_SIZE);
    this.musicToggle = addPixelText(this, TOGGLE_X, ROW_MUSIC_Y, "ON", MENU_OPTION_FONT_SIZE);
    this.musicToggle.setInteractive({ useHandCursor: true });
    this.musicToggle.on("pointerdown", () => {
      this.focusIndex = FOCUS_MUSIC;
      this.toggleCategory("music");
    });

    this.sfxLabel = addPixelText(this, LABEL_X, ROW_SFX_Y, "SOUND EFFECTS", MENU_OPTION_FONT_SIZE);
    this.sfxToggle = addPixelText(this, TOGGLE_X, ROW_SFX_Y, "ON", MENU_OPTION_FONT_SIZE);
    this.sfxToggle.setInteractive({ useHandCursor: true });
    this.sfxToggle.on("pointerdown", () => {
      this.focusIndex = FOCUS_SFX;
      this.toggleCategory("sfx");
    });

    const musicSlider = this.createSlider(ROW_MUSIC_Y, "music");
    this.musicTrack = musicSlider.track;
    this.musicFill = musicSlider.fill;
    this.musicNotches = musicSlider.notches;

    const sfxSlider = this.createSlider(ROW_SFX_Y, "sfx");
    this.sfxTrack = sfxSlider.track;
    this.sfxFill = sfxSlider.fill;
    this.sfxNotches = sfxSlider.notches;

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
      } else if (this.focusIndex === FOCUS_MUSIC) {
        this.toggleCategory("music");
      } else if (this.focusIndex === FOCUS_SFX) {
        this.toggleCategory("sfx");
      }
    }

    if (this.pendingBack && !this.keyEnter.isDown && !this.keySpace.isDown) {
      this.goBack();
    }
  }

  private createSlider(
    centerY: number,
    category: CategoryKey,
  ): {
    track: Phaser.GameObjects.Rectangle;
    fill: Phaser.GameObjects.Rectangle;
    notches: Phaser.GameObjects.Rectangle[];
  } {
    const track = this.add
      .rectangle(SLIDER_LEFT + SLIDER_WIDTH / 2, centerY, SLIDER_WIDTH, SLIDER_HEIGHT, SLIDER_TRACK)
      .setInteractive({ useHandCursor: true });
    track.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.focusIndex = category === "music" ? FOCUS_MUSIC : FOCUS_SFX;
      if (!this.isCategoryEnabled(category)) {
        this.refreshUi();
        return;
      }
      this.dragging = category;
      this.setLevelFromPointer(category, pointer.x);
    });

    const fill = this.add
      .rectangle(SLIDER_LEFT, centerY, 0, SLIDER_HEIGHT - 4, SLIDER_FILL)
      .setOrigin(0, 0.5);

    const notches: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < NOTCH_COUNT; i += 1) {
      const x = SLIDER_LEFT + (i / AUDIO_LEVEL_MAX) * SLIDER_WIDTH;
      const notch = this.add.rectangle(x, centerY, 2, SLIDER_HEIGHT + 6, SLIDER_NOTCH);
      notches.push(notch);
    }

    return { track, fill, notches };
  }

  private isCategoryEnabled(category: CategoryKey): boolean {
    return category === "music" ? this.settings.musicEnabled : this.settings.sfxEnabled;
  }

  private getLevel(category: CategoryKey): number {
    return category === "music" ? this.settings.musicLevel : this.settings.sfxLevel;
  }

  private setLevel(category: CategoryKey, level: number, preview: boolean): void {
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
    if (preview && next !== prev) {
      this.previewCategory(category);
    }
  }

  private setLevelFromPointer(category: CategoryKey, pointerX: number): void {
    const ratio = (pointerX - SLIDER_LEFT) / SLIDER_WIDTH;
    const level = clampLevel(ratio * AUDIO_LEVEL_MAX);
    this.setLevel(category, level, true);
  }

  private nudgeFocusedLevel(delta: number): void {
    if (this.focusIndex === FOCUS_MUSIC) {
      this.setLevel("music", this.settings.musicLevel + delta, true);
    } else if (this.focusIndex === FOCUS_SFX) {
      this.setLevel("sfx", this.settings.sfxLevel + delta, true);
    }
  }

  private toggleCategory(category: CategoryKey): void {
    if (category === "music") {
      this.settings = { ...this.settings, musicEnabled: !this.settings.musicEnabled };
    } else {
      this.settings = { ...this.settings, sfxEnabled: !this.settings.sfxEnabled };
    }
    saveAudioSettings(this.settings);
    this.refreshUi();
  }

  private previewCategory(category: CategoryKey): void {
    if (this.audioDisabled) {
      return;
    }
    if (category === "music") {
      playMusicVolumePreview(this, this.settings);
    } else {
      playSfxVolumePreview(this, this.settings);
    }
  }

  private refreshUi(): void {
    this.musicToggle.setText(this.settings.musicEnabled ? "ON" : "OFF");
    this.sfxToggle.setText(this.settings.sfxEnabled ? "ON" : "OFF");

    this.applyFocusTint(this.musicLabel, this.focusIndex === FOCUS_MUSIC);
    this.applyFocusTint(this.musicToggle, this.focusIndex === FOCUS_MUSIC);
    this.applyFocusTint(this.sfxLabel, this.focusIndex === FOCUS_SFX);
    this.applyFocusTint(this.sfxToggle, this.focusIndex === FOCUS_SFX);

    this.backText.setText(this.focusIndex === FOCUS_BACK ? "> BACK" : "  BACK");
    this.backText.setTint(this.focusIndex === FOCUS_BACK ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
    placePixelText(this.backText, PLAYFIELD_WIDTH / 2, PLAYFIELD_HEIGHT - 80, 0.5, 0.5);

    this.refreshSlider("music", this.musicFill, this.musicNotches, this.musicTrack);
    this.refreshSlider("sfx", this.sfxFill, this.sfxNotches, this.sfxTrack);
  }

  private applyFocusTint(text: Phaser.GameObjects.BitmapText, focused: boolean): void {
    text.setTint(focused ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
  }

  private refreshSlider(
    category: CategoryKey,
    fill: Phaser.GameObjects.Rectangle,
    notches: Phaser.GameObjects.Rectangle[],
    track: Phaser.GameObjects.Rectangle,
  ): void {
    const enabled = this.isCategoryEnabled(category);
    const level = this.getLevel(category);
    const width = (level / AUDIO_LEVEL_MAX) * SLIDER_WIDTH;
    fill.setDisplaySize(Math.max(0, width), SLIDER_HEIGHT - 4);
    fill.setFillStyle(enabled ? SLIDER_FILL : SLIDER_FILL_DIM);
    track.setFillStyle(enabled ? SLIDER_TRACK : TEXT_COLOR_DIM);
    for (const notch of notches) {
      notch.setFillStyle(enabled ? SLIDER_NOTCH : SLIDER_NOTCH_DIM);
    }
  }

  private goBack(): void {
    this.sound.stopByKey("siren");
    this.scene.start("MenuScene");
  }
}
