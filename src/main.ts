import Phaser from "phaser";
import { parseQueryParams } from "./domain/queryParams";
import { parseRunLogFillFlag } from "./domain/runLogFillFlag";
import { isAgentPort } from "./domain/soundFlag";
import { installDebugHook } from "./game/scenes/installDebugHook";
import { gameConfig } from "./game/config";
import { fillSyntheticRuns, relabelAbandoned } from "./game/storage/runLogStorage";
import "./styles.css";

relabelAbandoned();
const runLogFill = parseRunLogFillFlag(parseQueryParams(location.search));
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
