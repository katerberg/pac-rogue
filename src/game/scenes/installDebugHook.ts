import type Phaser from "phaser";
import { runLogOverrunActive, storedRunCount } from "../storage/runLogStorage";
import { PlayScene } from "./PlayScene";
import { SettingsScene } from "./SettingsScene";

type SceneStatus = "running" | "paused" | "sleeping";

declare global {
  interface Window {
    __PAC_ROGUE_DEBUG__?: {
      snapshot: () => {
        scenes: Record<string, SceneStatus>;
        play: ReturnType<PlayScene["debugSnapshot"]> | null;
        settings: ReturnType<SettingsScene["debugSnapshot"]> | null;
        runLog: { stored: number; overrun: boolean };
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
      const settings = game.scene.getScene("SettingsScene");
      return {
        scenes,
        play: play instanceof PlayScene && "PlayScene" in scenes ? play.debugSnapshot() : null,
        settings:
          settings instanceof SettingsScene && "SettingsScene" in scenes
            ? settings.debugSnapshot()
            : null,
        runLog: { stored: storedRunCount(), overrun: runLogOverrunActive() },
        sounds: playingSounds(game),
      };
    },
  };
}
