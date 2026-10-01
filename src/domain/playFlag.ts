import { parseLearnAllMode } from "./seenRecord";

export type BootSceneKey = "PlayScene" | "LearnScene" | "MenuScene";

export function shouldAutoPlay(params: URLSearchParams): boolean {
  return params.get("play") === "1";
}

export function bootSceneKey(params: URLSearchParams): BootSceneKey {
  if (shouldAutoPlay(params)) {
    return "PlayScene";
  }
  return parseLearnAllMode(params) !== null ? "LearnScene" : "MenuScene";
}
