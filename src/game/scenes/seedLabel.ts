import type Phaser from "phaser";
import { playerDisplaySize } from "../../domain/maze";
import { PLAYFIELD_HEIGHT } from "../../domain/playfield";
import { addPixelText, placePixelText, UPGRADES_HUD_FONT_SIZE } from "./pixelFont";

const SEED_LABEL_X = 12;
const SEED_LABEL_ALPHA = 0.4;

export function addSeedLabel(scene: Phaser.Scene, seed: string): Phaser.GameObjects.BitmapText {
  const y = PLAYFIELD_HEIGHT - 16 - playerDisplaySize();
  const label = addPixelText(scene, SEED_LABEL_X, y, `SEED ${seed}`, UPGRADES_HUD_FONT_SIZE);
  placePixelText(label, SEED_LABEL_X, y, 0, 1);
  return label.setAlpha(SEED_LABEL_ALPHA);
}
