import type Phaser from "phaser";
import { playerDisplaySize } from "../../domain/maze";
import { PLAYFIELD_HEIGHT } from "../../domain/playfield";
import { UPGRADES_HUD_FONT_SIZE } from "./pixelFont";
import { addGameText, placeGameText, type GameText } from "./neonFont";

const SEED_LABEL_X = 12;
const SEED_LABEL_ALPHA = 0.4;

export function addSeedLabel(scene: Phaser.Scene, seed: string): GameText {
  const y = PLAYFIELD_HEIGHT - 16 - playerDisplaySize();
  const label = addGameText(scene, SEED_LABEL_X, y, `SEED ${seed}`, UPGRADES_HUD_FONT_SIZE);
  placeGameText(label, SEED_LABEL_X, y, 0, 1);
  return label.setAlpha(SEED_LABEL_ALPHA);
}
