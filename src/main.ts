import Phaser from "phaser";
import { parseQueryParams } from "./domain/queryParams";
import { parseRunLogFillFlag } from "./domain/runLogFillFlag";
import { isAgentPort } from "./domain/soundFlag";
import { promptForCustomMaze } from "./customMazePrompt";
import { installDebugHook } from "./game/scenes/installDebugHook";
import { gameConfig } from "./game/config";
import { drainRunUploads } from "./game/net/apiClient";
import { fillSyntheticRuns, relabelAbandoned } from "./game/storage/runLogStorage";
import "./styles.css";

relabelAbandoned();
void drainRunUploads();
const runLogFill = parseRunLogFillFlag(parseQueryParams(location.search));
if (runLogFill !== null && isAgentPort(location.port)) {
  fillSyntheticRuns(runLogFill);
}

declare global {
  interface Window {
    __PAC_ROGUE_GAME__?: Phaser.Game;
  }
}

async function boot(): Promise<void> {
  if (parseQueryParams(location.search).has("customMaze")) {
    await promptForCustomMaze();
  }
  const game = new Phaser.Game(gameConfig);
  window.__PAC_ROGUE_GAME__ = game;
  if (isAgentPort(location.port)) {
    installDebugHook(game);
  }
}

void boot();
