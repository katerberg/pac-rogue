import Phaser from "phaser";
import { createKeyRepeatState, tickKeyRepeat, type KeyRepeatState } from "../../domain/keyRepeat";
import { PLAYFIELD_WIDTH } from "../../domain/playfield";
import { preloadSfx, startLoopingSfx } from "../audio/sfx";
import {
  addPixelText,
  MENU_OPTION_FONT_SIZE,
  MENU_TITLE_FONT_SIZE,
  placePixelText,
  TEXT_COLOR_WHITE,
  TEXT_COLOR_YELLOW,
} from "./pixelFont";

const OPTIONS = [
  { label: "START", scene: "PlayScene" },
  { label: "LEARN", scene: "LearnScene" },
  { label: "HIGH SCORES", scene: "HighScoresScene" },
  { label: "SETTINGS", scene: "SettingsScene" },
] as const;

export class MenuScene extends Phaser.Scene {
  private selectedIndex = 0;
  private optionTexts: Phaser.GameObjects.BitmapText[] = [];
  private optionCenters: { x: number; y: number }[] = [];
  private titleText!: Phaser.GameObjects.BitmapText;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private upRepeat: KeyRepeatState = createKeyRepeatState();
  private downRepeat: KeyRepeatState = createKeyRepeatState();

  constructor() {
    super("MenuScene");
  }

  preload(): void {
    preloadSfx(this);
  }

  create(): void {
    this.selectedIndex = 0;
    this.optionTexts = [];
    this.optionCenters = [];
    this.upRepeat = createKeyRepeatState();
    this.downRepeat = createKeyRepeatState();
    startLoopingSfx(this, "menuMusic");

    this.titleText = addPixelText(this, PLAYFIELD_WIDTH / 2, 120, "DOT-MAN", MENU_TITLE_FONT_SIZE);
    placePixelText(this.titleText, PLAYFIELD_WIDTH / 2, 120, 0.5, 0.5);

    const startY = 280;
    const gap = 48;
    OPTIONS.forEach((option, index) => {
      const center = { x: PLAYFIELD_WIDTH / 2, y: startY + index * gap };
      const text = addPixelText(this, center.x, center.y, option.label, MENU_OPTION_FONT_SIZE);

      text.on("pointerover", () => {
        this.selectedIndex = index;
        this.refreshOptions();
      });
      text.on("pointerdown", () => {
        this.selectedIndex = index;
        this.activateSelected();
      });

      this.optionCenters.push(center);
      this.optionTexts.push(text);
    });

    this.refreshOptions();
    for (const text of this.optionTexts) {
      text.setInteractive({ useHandCursor: true });
    }

    if (this.input.keyboard === null) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update(_time: number, delta: number): void {
    if (this.input.keyboard === null) {
      return;
    }

    if (this.tickUp(delta)) {
      this.selectedIndex = (this.selectedIndex + OPTIONS.length - 1) % OPTIONS.length;
      this.refreshOptions();
    } else if (this.tickDown(delta)) {
      this.selectedIndex = (this.selectedIndex + 1) % OPTIONS.length;
      this.refreshOptions();
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      this.activateSelected();
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

  private refreshOptions(): void {
    this.optionTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      const label = OPTIONS[index].label;
      const center = this.optionCenters[index]!;
      text.setText(selected ? `> ${label}` : `  ${label}`);
      text.setTint(selected ? TEXT_COLOR_YELLOW : TEXT_COLOR_WHITE);
      placePixelText(text, center.x, center.y, 0.5, 0.5);
    });
  }

  private activateSelected(): void {
    this.scene.start(OPTIONS[this.selectedIndex].scene);
  }
}
