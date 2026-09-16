import Phaser from "phaser";

export function bindIntegerMaxZoom(game: Phaser.Game): void {
  const apply = (): void => {
    const next = game.scale.getMaxZoom();
    if (game.scale.zoom !== next) {
      game.scale.setZoom(next);
    }
  };

  game.events.once(Phaser.Core.Events.READY, apply);
  game.scale.on(Phaser.Scale.Events.RESIZE, apply);
}
