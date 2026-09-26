import Phaser from "phaser";
import { colorToCssHex, MAZE_BACKGROUND_COLOR } from "../domain/maze";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../domain/playfield";
import { shouldAutoPlay } from "../domain/playFlag";
import { isSoundEnabled } from "../domain/soundFlag";
import { HighScoresScene } from "./scenes/HighScoresScene";
import { LearnScene } from "./scenes/LearnScene";
import { MenuScene } from "./scenes/MenuScene";
import { PauseScene } from "./scenes/PauseScene";
import { PlayScene } from "./scenes/PlayScene";
import { SettingsScene } from "./scenes/SettingsScene";

export const GAME_WIDTH = PLAYFIELD_WIDTH;
export const GAME_HEIGHT = PLAYFIELD_HEIGHT;

function createInteractiveAudioContext(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") {
    return undefined;
  }
  return new AudioContext({ latencyHint: "interactive" });
}

const urlParams = new URLSearchParams(location.search);
const soundEnabled = isSoundEnabled(urlParams, location.port);
const audioContext = soundEnabled ? createInteractiveAudioContext() : undefined;
const bootScenes = shouldAutoPlay(urlParams)
  ? [PlayScene, MenuScene, LearnScene, HighScoresScene, SettingsScene, PauseScene]
  : [MenuScene, LearnScene, HighScoresScene, SettingsScene, PlayScene, PauseScene];

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: colorToCssHex(MAZE_BACKGROUND_COLOR),
  banner: false,
  scene: bootScenes,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
  },
  audio: soundEnabled ? (audioContext ? { context: audioContext } : undefined) : { noAudio: true },
  callbacks: {
    postBoot: (game) => {
      game.sound.pauseOnBlur = false;
    },
  },
};
