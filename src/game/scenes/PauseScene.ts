import Phaser from "phaser";
import { createKeyRepeatState, tickKeyRepeat, type KeyRepeatState } from "../../domain/keyRepeat";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../../domain/playfield";
import type { PlayScene } from "./PlayScene";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";

const RESUME_INDEX = 0;
const SETTINGS_INDEX = 1;
const QUIT_INDEX = 2;
const ROW_COUNT = 3;

const ROW_START_Y = 280;
const ROW_GAP = 56;
const ROW_Y = [ROW_START_Y, ROW_START_Y + ROW_GAP, ROW_START_Y + ROW_GAP * 2];
const ROW_CENTER_X = PLAYFIELD_WIDTH / 2;

const SURE_LABEL_X = ROW_CENTER_X - 70;
const YES_X = ROW_CENTER_X + 10;
const NO_X = ROW_CENTER_X + 70;

export class PauseScene extends Phaser.Scene {
  private selectedIndex = RESUME_INDEX;
  private moveCooldownMs = 0;
  private upRepeat: KeyRepeatState = createKeyRepeatState();
  private downRepeat: KeyRepeatState = createKeyRepeatState();
  private confirmingQuit = false;
  private quitSelectingYes = false;

  private resumeText!: Phaser.GameObjects.BitmapText;
  private settingsText!: Phaser.GameObjects.BitmapText;
  private quitText!: Phaser.GameObjects.BitmapText;
  private sureLabel!: Phaser.GameObjects.BitmapText;
  private yesText!: Phaser.GameObjects.BitmapText;
  private noText!: Phaser.GameObjects.BitmapText;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("PauseScene");
  }

  create(): void {
    this.selectedIndex = RESUME_INDEX;
    this.moveCooldownMs = 0;
    this.upRepeat = createKeyRepeatState();
    this.downRepeat = createKeyRepeatState();
    this.confirmingQuit = false;
    this.quitSelectingYes = false;

    this.add.rectangle(
      PLAYFIELD_WIDTH / 2,
      PLAYFIELD_HEIGHT / 2,
      PLAYFIELD_WIDTH,
      PLAYFIELD_HEIGHT,
      0x000000,
      0.65,
    );

    const title = addPixelText(this, ROW_CENTER_X, 160, "PAUSED", MENU_TITLE_FONT_SIZE);
    placePixelText(title, ROW_CENTER_X, 160, 0.5, 0.5);

    this.resumeText = addPixelText(
      this,
      ROW_CENTER_X,
      ROW_Y[RESUME_INDEX]!,
      "",
      MENU_OPTION_FONT_SIZE,
    );
    this.settingsText = addPixelText(
      this,
      ROW_CENTER_X,
      ROW_Y[SETTINGS_INDEX]!,
      "",
      MENU_OPTION_FONT_SIZE,
    );
    this.quitText = addPixelText(this, ROW_CENTER_X, ROW_Y[QUIT_INDEX]!, "", MENU_OPTION_FONT_SIZE);

    this.sureLabel = addPixelText(
      this,
      SURE_LABEL_X,
      ROW_Y[QUIT_INDEX]!,
      "SURE?",
      MENU_OPTION_FONT_SIZE,
    );
    this.yesText = addPixelText(this, YES_X, ROW_Y[QUIT_INDEX]!, "YES", MENU_OPTION_FONT_SIZE);
    this.noText = addPixelText(this, NO_X, ROW_Y[QUIT_INDEX]!, "NO", MENU_OPTION_FONT_SIZE);
    placePixelText(this.sureLabel, SURE_LABEL_X, ROW_Y[QUIT_INDEX]!, 0.5, 0.5);
    placePixelText(this.yesText, YES_X, ROW_Y[QUIT_INDEX]!, 0.5, 0.5);
    placePixelText(this.noText, NO_X, ROW_Y[QUIT_INDEX]!, 0.5, 0.5);

    for (const [text, index] of [
      [this.resumeText, RESUME_INDEX],
      [this.settingsText, SETTINGS_INDEX],
      [this.quitText, QUIT_INDEX],
    ] as const) {
      text.on("pointerover", () => this.focusRow(index));
      text.on("pointerdown", () => {
        this.focusRow(index);
        this.activateSelected();
      });
    }
    this.yesText.on("pointerdown", () => this.confirmQuit());
    this.noText.on("pointerdown", () => this.cancelQuitConfirm());

    for (const text of [
      this.resumeText,
      this.settingsText,
      this.quitText,
      this.yesText,
      this.noText,
    ]) {
      text.setInteractive({ useHandCursor: true });
    }

    this.refreshMenu();

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
  }

  update(_time: number, delta: number): void {
    if (this.input.keyboard === null) {
      return;
    }

    this.moveCooldownMs = Math.max(0, this.moveCooldownMs - delta);

    if (this.confirmingQuit) {
      this.updateQuitConfirm(delta);
      return;
    }

    this.updateMenuNav(delta);
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

  private updateMenuNav(delta: number): void {
    if (this.tickUp(delta)) {
      this.moveSelectionUp();
    } else if (this.tickDown(delta)) {
      this.focusRow((this.selectedIndex + 1) % ROW_COUNT);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      this.activateSelected();
    }
  }

  private updateQuitConfirm(delta: number): void {
    if (this.tickUp(delta)) {
      this.moveSelectionUp();
      return;
    }

    const left =
      Phaser.Input.Keyboard.JustDown(this.cursors.left!) ||
      Phaser.Input.Keyboard.JustDown(this.keyA);
    const right =
      Phaser.Input.Keyboard.JustDown(this.cursors.right!) ||
      Phaser.Input.Keyboard.JustDown(this.keyD);

    if (this.moveCooldownMs === 0 && (left || right)) {
      this.quitSelectingYes = !this.quitSelectingYes;
      this.refreshQuitConfirmTint();
      this.moveCooldownMs = 150;
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      if (this.quitSelectingYes) {
        this.confirmQuit();
      } else {
        this.cancelQuitConfirm();
      }
    }
  }

  private focusRow(index: number): void {
    this.selectedIndex = index;
    this.refreshMenu();
  }

  private moveSelectionUp(): void {
    this.confirmingQuit = false;
    this.quitSelectingYes = false;
    this.focusRow((this.selectedIndex + ROW_COUNT - 1) % ROW_COUNT);
  }

  private activateSelected(): void {
    if (this.selectedIndex === RESUME_INDEX) {
      this.resumeGame();
    } else if (this.selectedIndex === SETTINGS_INDEX) {
      this.openSettings();
    } else {
      this.beginQuitConfirm();
    }
  }

  private resumeGame(): void {
    const playScene = this.scene.get("PlayScene") as PlayScene;
    playScene.resumeFromPauseMenu();
    this.scene.stop();
  }

  private openSettings(): void {
    this.scene.stop();
    this.scene.start("SettingsScene", { returnScene: "PauseScene" });
  }

  private beginQuitConfirm(): void {
    this.confirmingQuit = true;
    this.quitSelectingYes = false;
    this.refreshMenu();
  }

  private cancelQuitConfirm(): void {
    this.confirmingQuit = false;
    this.quitSelectingYes = false;
    this.refreshMenu();
  }

  private confirmQuit(): void {
    this.scene.stop("PlayScene");
    this.scene.stop();
    this.scene.start("MenuScene");
  }

  private refreshMenu(): void {
    this.setRowText(this.resumeText, "RESUME", RESUME_INDEX);
    this.setRowText(this.settingsText, "SETTINGS", SETTINGS_INDEX);

    this.quitText.setVisible(!this.confirmingQuit);
    this.sureLabel.setVisible(this.confirmingQuit);
    this.yesText.setVisible(this.confirmingQuit);
    this.noText.setVisible(this.confirmingQuit);

    if (this.confirmingQuit) {
      this.refreshQuitConfirmTint();
    } else {
      this.setRowText(this.quitText, "QUIT", QUIT_INDEX);
    }
  }

  private setRowText(text: Phaser.GameObjects.BitmapText, label: string, index: number): void {
    const selected = index === this.selectedIndex;
    text.setText(selected ? `> ${label}` : `  ${label}`);
    text.setTint(selected ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
    placePixelText(text, ROW_CENTER_X, ROW_Y[index]!, 0.5, 0.5);
  }

  private refreshQuitConfirmTint(): void {
    this.yesText.setTint(this.quitSelectingYes ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
    this.noText.setTint(this.quitSelectingYes ? TEXT_COLOR_WHITE : TEXT_COLOR_YELLOW);
  }
}
