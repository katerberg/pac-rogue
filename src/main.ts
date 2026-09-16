import Phaser from "phaser";
import { gameConfig } from "./game/config";
import "./styles.css";

const game = new Phaser.Game(gameConfig);

declare global {
  interface Window {
    __PAC_ROGUE_GAME__?: Phaser.Game;
  }
}

window.__PAC_ROGUE_GAME__ = game;
