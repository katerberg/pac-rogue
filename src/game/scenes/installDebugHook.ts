import type Phaser from "phaser";
import { storedRunCount } from "../storage/runLogStorage";
import { HighScoresScene } from "./HighScoresScene";
import { LearnScene } from "./LearnScene";
import { PlayScene } from "./PlayScene";
import { SettingsScene } from "./SettingsScene";

type SceneStatus = "running" | "paused" | "sleeping";

declare global {
  interface Window {
    __PAC_ROGUE_DEBUG__?: {
      snapshot: () => {
        scenes: Record<string, SceneStatus>;
        play: ReturnType<PlayScene["debugSnapshot"]> | null;
        learn: ReturnType<LearnScene["debugSnapshot"]> | null;
        settings: ReturnType<SettingsScene["debugSnapshot"]> | null;
        highScores: ReturnType<HighScoresScene["debugSnapshot"]> | null;
        runLog: { stored: number };
        sounds: Record<string, boolean>;
      };
    };
  }
}

function sceneStatus(scene: Phaser.Scene): SceneStatus | null {
  if (scene.scene.isActive()) {
    return "running";
  }
  if (scene.scene.isPaused()) {
    return "paused";
  }
  return scene.scene.isSleeping() ? "sleeping" : null;
}

function playingSounds(game: Phaser.Game): Record<string, boolean> {
  if (game.config.audio.noAudio === true) {
    return {};
  }
  return Object.fromEntries(game.sound.getAllPlaying().map((sound) => [sound.key, true]));
}

export function installDebugHook(game: Phaser.Game): void {
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
      const learn = game.scene.getScene("LearnScene");
      const settings = game.scene.getScene("SettingsScene");
      const highScores = game.scene.getScene("HighScoresScene");
      return {
        scenes,
        play: play instanceof PlayScene && "PlayScene" in scenes ? play.debugSnapshot() : null,
        learn: learn instanceof LearnScene && "LearnScene" in scenes ? learn.debugSnapshot() : null,
        settings:
          settings instanceof SettingsScene && "SettingsScene" in scenes
            ? settings.debugSnapshot()
            : null,
        highScores:
          highScores instanceof HighScoresScene && "HighScoresScene" in scenes
            ? highScores.debugSnapshot()
            : null,
        runLog: { stored: storedRunCount() },
        sounds: playingSounds(game),
      };
    },
  };
}
