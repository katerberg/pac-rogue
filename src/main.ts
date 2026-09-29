import Phaser from "phaser";
import { isAgentPort } from "./domain/soundFlag";
import { gameConfig } from "./game/config";
import { PlayScene } from "./game/scenes/PlayScene";
import "./styles.css";

const game = new Phaser.Game(gameConfig);

type SceneStatus = "running" | "paused" | "sleeping";

declare global {
  interface Window {
    __PAC_ROGUE_GAME__?: Phaser.Game;
    __PAC_ROGUE_DEBUG__?: {
      snapshot: () => {
        scenes: Record<string, SceneStatus>;
        play: ReturnType<PlayScene["debugSnapshot"]> | null;
      };
    };
  }
}

window.__PAC_ROGUE_GAME__ = game;

function sceneStatus(scene: Phaser.Scene): SceneStatus | null {
  if (scene.scene.isActive()) {
    return "running";
  }
  if (scene.scene.isPaused()) {
    return "paused";
  }
  return scene.scene.isSleeping() ? "sleeping" : null;
}

if (isAgentPort(location.port)) {
  window.__PAC_ROGUE_DEBUG__ = {
    snapshot: () => {
      const scenes: Record<string, SceneStatus> = {};
      for (const scene of game.scene.getScenes(false)) {
        const status = sceneStatus(scene);
        if (status !== null) {
          scenes[scene.scene.key] = status;
        }
      }
      const play = game.scene.getScene("PlayScene");
      return {
        scenes,
        play: play instanceof PlayScene && "PlayScene" in scenes ? play.debugSnapshot() : null,
      };
    },
  };
}
