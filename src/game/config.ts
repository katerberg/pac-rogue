import Phaser from "phaser";
import { colorToCssHex, MAZE_BACKGROUND_COLOR } from "../domain/maze";
import { bootSceneKey } from "../domain/playFlag";
import { isSoundEnabled } from "../domain/soundFlag";
import { followWindowRenderScale, windowCanvasSize } from "./renderScale";
import { HighScoresScene } from "./scenes/HighScoresScene";
import { LearnScene } from "./scenes/LearnScene";
import { MenuScene } from "./scenes/MenuScene";
import { PauseScene } from "./scenes/PauseScene";
import { PlayScene } from "./scenes/PlayScene";
import { RunLogOverrunScene } from "./scenes/RunLogOverrunScene";
import { SettingsScene } from "./scenes/SettingsScene";

function createInteractiveAudioContext(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") {
    return undefined;
  }
  return new AudioContext({ latencyHint: "interactive" });
}

const urlParams = new URLSearchParams(location.search);
const soundEnabled = isSoundEnabled(urlParams, location.port);
const audioContext = soundEnabled ? createInteractiveAudioContext() : undefined;
const allScenes = [
  MenuScene,
  LearnScene,
  HighScoresScene,
  SettingsScene,
  PlayScene,
  PauseScene,
  RunLogOverrunScene,
];
const firstScene = { PlayScene, LearnScene, MenuScene }[bootSceneKey(urlParams)];
const bootScenes = [firstScene, ...allScenes.filter((scene) => scene !== firstScene)];

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  ...windowCanvasSize(),
  backgroundColor: colorToCssHex(MAZE_BACKGROUND_COLOR),
  banner: false,
  scene: bootScenes,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
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
