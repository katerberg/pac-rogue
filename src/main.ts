import Phaser from "phaser";
import { parseRunLogFillFlag } from "./domain/runLogFillFlag";
import { isAgentPort } from "./domain/soundFlag";
import { installDebugHook } from "./game/scenes/installDebugHook";
import { gameConfig } from "./game/config";
import { fillSyntheticRuns } from "./game/storage/runLogStorage";
import "./styles.css";

const runLogFill = parseRunLogFillFlag(new URLSearchParams(location.search));
if (runLogFill !== null && isAgentPort(location.port)) {
  fillSyntheticRuns(runLogFill);
}

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
