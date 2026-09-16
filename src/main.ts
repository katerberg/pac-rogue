import Phaser from "phaser";
import { computePixelZoom } from "./domain/pixelZoom";
import { gameConfig } from "./game/config";
import "./styles.css";

const ZOOM_EPSILON = 1e-4;

const game = new Phaser.Game(gameConfig);

const applyPixelLetterboxScale = (): void => {
  const next = computePixelZoom(game.scale.parentSize.width, game.scale.parentSize.height);
  if (Math.abs(game.scale.zoom - next) > ZOOM_EPSILON) {
    game.scale.setZoom(next);
  }
};

game.events.once(Phaser.Core.Events.READY, applyPixelLetterboxScale);
game.scale.on(Phaser.Scale.Events.RESIZE, applyPixelLetterboxScale);

declare global {
  interface Window {
    __PAC_ROGUE_GAME__?: Phaser.Game;
  }
}

window.__PAC_ROGUE_GAME__ = game;
