import Phaser from "phaser";

export function displayTextResolution(scale: Phaser.Scale.ScaleManager): number {
  const upscale = scale.displaySize.width / scale.gameSize.width;
  return Math.max(1, upscale * (window.devicePixelRatio || 1));
}

export function bindDisplayTextResolution(
  scene: Phaser.Scene,
  getTexts: () => readonly Phaser.GameObjects.Text[],
): void {
  const refresh = (): void => {
    const resolution = displayTextResolution(scene.scale);
    for (const text of getTexts()) {
      text.setResolution(resolution);
      text.updateText();
    }
  };

  refresh();
  scene.scale.on(Phaser.Scale.Events.RESIZE, refresh);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, refresh);
  });
}
