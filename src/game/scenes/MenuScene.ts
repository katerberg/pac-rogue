import Phaser from "phaser";
import { PLAYFIELD_WIDTH } from "../../domain/playfield";
import { menuOptionSelectedStyle, menuOptionStyle, menuTitleStyle } from "../ui/textStyles";

const OPTIONS = [
  { label: "START", scene: "PlayScene" },
  { label: "HIGH SCORES", scene: "HighScoresScene" },
] as const;

export class MenuScene extends Phaser.Scene {
  private selectedIndex = 0;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private moveCooldownMs = 0;

  constructor() {
    super("MenuScene");
  }

  create(): void {
    this.selectedIndex = 0;
    this.optionTexts = [];
    this.moveCooldownMs = 0;

    this.add.text(PLAYFIELD_WIDTH / 2, 120, "PAC-ROGUE", menuTitleStyle).setOrigin(0.5, 0.5);

    const startY = 280;
    const gap = 48;
    OPTIONS.forEach((option, index) => {
      const text = this.add
        .text(PLAYFIELD_WIDTH / 2, startY + index * gap, option.label, menuOptionStyle)
        .setOrigin(0.5, 0.5)
        .setInteractive({ useHandCursor: true });

      text.on("pointerover", () => {
        this.selectedIndex = index;
        this.refreshOptions();
      });
      text.on("pointerdown", () => {
        this.selectedIndex = index;
        this.activateSelected();
      });

      this.optionTexts.push(text);
    });

    this.refreshOptions();

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

    this.moveCooldownMs = Math.max(0, this.moveCooldownMs - delta);

    const up =
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.keyW);
    const down =
      Phaser.Input.Keyboard.JustDown(this.cursors.down!) ||
      Phaser.Input.Keyboard.JustDown(this.keyS);

    if (this.moveCooldownMs === 0) {
      if (up) {
        this.selectedIndex = (this.selectedIndex + OPTIONS.length - 1) % OPTIONS.length;
        this.refreshOptions();
        this.moveCooldownMs = 150;
      } else if (down) {
        this.selectedIndex = (this.selectedIndex + 1) % OPTIONS.length;
        this.refreshOptions();
        this.moveCooldownMs = 150;
      }
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.keyEnter) ||
      Phaser.Input.Keyboard.JustDown(this.keySpace)
    ) {
      this.activateSelected();
    }
  }

  private refreshOptions(): void {
    this.optionTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      const label = OPTIONS[index].label;
      text.setText(selected ? `> ${label}` : `  ${label}`);
      text.setStyle(selected ? menuOptionSelectedStyle : menuOptionStyle);
    });
  }

  private activateSelected(): void {
    this.scene.start(OPTIONS[this.selectedIndex].scene);
  }
}
