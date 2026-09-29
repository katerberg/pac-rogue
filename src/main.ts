import Phaser from "phaser";
import { isAgentPort } from "./domain/soundFlag";
import { installDebugHook } from "./game/scenes/installDebugHook";
import { gameConfig } from "./game/config";
import "./styles.css";

const game = new Phaser.Game(gameConfig);

declare global {
  interface Window {
    __PAC_ROGUE_GAME__?: Phaser.Game;
  }
}

window.__PAC_ROGUE_GAME__ = game;

if (isAgentPort(location.port)) {
  installDebugHook(game);
}
