import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../config";

/**
 * Minimal boot scene. Proves the Phaser pipeline works.
 * Gameplay systems belong elsewhere later — keep this thin.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e)
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "pac-rogue", {
        fontFamily: "monospace",
        fontSize: "48px",
        color: "#f5e6a3",
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 56, "foundation online", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#9ad0c2",
      })
      .setOrigin(0.5);
  }
}
