import Phaser from "phaser";
import { colorToCssHex, MAZE_BACKGROUND_COLOR } from "../domain/maze";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../domain/playfield";
import { isSoundEnabled } from "../domain/soundFlag";
import { HighScoresScene } from "./scenes/HighScoresScene";
import { MenuScene } from "./scenes/MenuScene";
import { PlayScene } from "./scenes/PlayScene";

export const GAME_WIDTH = PLAYFIELD_WIDTH;
export const GAME_HEIGHT = PLAYFIELD_HEIGHT;

function createInteractiveAudioContext(): AudioContext | undefined {
  if (typeof AudioContext === "undefined") {
    return undefined;
  }
  return new AudioContext({ latencyHint: "interactive" });
}

const soundEnabled = isSoundEnabled(new URLSearchParams(location.search), location.port);
const audioContext = soundEnabled ? createInteractiveAudioContext() : undefined;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: colorToCssHex(MAZE_BACKGROUND_COLOR),
  scene: [MenuScene, HighScoresScene, PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
  },
  audio: soundEnabled ? (audioContext ? { context: audioContext } : undefined) : { noAudio: true },
};
