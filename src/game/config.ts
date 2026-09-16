import Phaser from "phaser";
import { PLAYFIELD_HEIGHT, PLAYFIELD_WIDTH } from "../domain/playfield";
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

const audioContext = createInteractiveAudioContext();

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#1a1a2e",
  scene: [MenuScene, HighScoresScene, PlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
  },
  audio: audioContext ? { context: audioContext } : undefined,
};
