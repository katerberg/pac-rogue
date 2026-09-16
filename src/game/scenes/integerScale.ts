import Phaser from "phaser";
import { computePixelZoom } from "../../domain/pixelZoom";

const ZOOM_EPSILON = 1e-4;

export function bindPixelLetterboxScale(game: Phaser.Game): void {
  const apply = (): void => {
    const next = computePixelZoom(game.scale.parentSize.width, game.scale.parentSize.height);
    if (Math.abs(game.scale.zoom - next) > ZOOM_EPSILON) {
      game.scale.setZoom(next);
    }
  };

  game.events.once(Phaser.Core.Events.READY, apply);
  game.scale.on(Phaser.Scale.Events.RESIZE, apply);
}
