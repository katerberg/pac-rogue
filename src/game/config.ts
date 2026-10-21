import Phaser from "phaser";
import { parseQueryParams } from "../domain/queryParams";
import { colorToCssHex, MAZE_BACKGROUND_COLOR } from "../domain/maze";
import { bootSceneKey } from "../domain/playFlag";
import { isSoundEnabled } from "../domain/soundFlag";
import { followWindowRenderScale, windowCanvas } from "./renderScale";
import { HighScoresScene } from "./scenes/HighScoresScene";
import { LearnScene } from "./scenes/LearnScene";
import { MenuScene } from "./scenes/MenuScene";
import { PauseScene } from "./scenes/PauseScene";
import { PlayScene } from "./scenes/PlayScene";
import { SettingsScene } from "./scenes/SettingsScene";

function createInteractiveAudioContext(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") {
    return undefined;
  }
  return new AudioContext({ latencyHint: "interactive" });
}

const urlParams = parseQueryParams(location.search);
const soundEnabled = isSoundEnabled(urlParams, location.port);
const audioContext = soundEnabled ? createInteractiveAudioContext() : undefined;
const allScenes = [MenuScene, LearnScene, HighScoresScene, SettingsScene, PlayScene, PauseScene];
const firstScene = { PlayScene, LearnScene, MenuScene }[bootSceneKey(urlParams)];
const bootScenes = [firstScene, ...allScenes.filter((scene) => scene !== firstScene)];
const canvas = windowCanvas();

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: canvas.width,
  height: canvas.height,
  backgroundColor: colorToCssHex(MAZE_BACKGROUND_COLOR),
  banner: false,
  scene: bootScenes,
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: canvas.zoom,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    smoothPixelArt: true,
    roundPixels: true,
  },
  audio: soundEnabled ? (audioContext ? { context: audioContext } : undefined) : { noAudio: true },
  callbacks: {
    postBoot: (game) => {
      game.sound.pauseOnBlur = false;
      followWindowRenderScale(game);
    },
  },
};
