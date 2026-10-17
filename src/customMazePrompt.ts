import { generateMazeAsciiWithRetries } from "./domain/mazeGenerate";
import { MAZE_ASCII_BY_ID } from "./domain/mazeLayouts";
import { loadCustomMaze, saveCustomMaze } from "./game/storage/customMazeStorage";

const DEFAULT_SEED = "custom";

function defaultMaze(): string {
  return generateMazeAsciiWithRetries(DEFAULT_SEED)?.ascii ?? MAZE_ASCII_BY_ID.mazeSmall;
}

export function promptForCustomMaze(): Promise<void> {
  return new Promise((resolve) => {
    const panel = document.createElement("div");
    panel.id = "custom-maze-prompt";
    const label = document.createElement("label");
    label.textContent = "Paste a maze (# wall, . dot, @ power, P player, H house, = door, - empty)";
    const text = document.createElement("textarea");
    text.id = "custom-maze-text";
    text.spellcheck = false;
    text.value = loadCustomMaze() ?? defaultMaze();
    text.rows = 32;
    text.cols = 40;
    const start = document.createElement("button");
    start.id = "custom-maze-start";
    start.textContent = "Start";
    start.addEventListener("click", () => {
      saveCustomMaze(text.value.replace(/\r/g, "").trim());
      panel.remove();
      resolve();
    });
    const reset = document.createElement("button");
    reset.id = "custom-maze-reset";
    reset.textContent = "Reset";
    reset.addEventListener("click", () => {
      text.value = defaultMaze();
    });
    const buttons = document.createElement("div");
    buttons.append(reset, start);
    panel.append(label, text, buttons);
    document.body.append(panel);
  });
}
