import Phaser from "phaser";

const HALO_PEAK_ALPHA = 0.85;
const HALO_PULSE_MIN = 0.5;
const HALO_PULSE_MS = 900;

type RareFx = { destroy: () => void };

export function addRareFx(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  width: number,
  height: number,
  color: number,
): RareFx {
  const reach = Math.max(4, Math.round(Math.min(width, height) * 0.12));
  const halo = scene.add.graphics();
  for (let step = 1; step <= reach; step += 1) {
    const falloff = 1 - step / (reach + 1);
    halo.lineStyle(1, color, HALO_PEAK_ALPHA * falloff * falloff);
    halo.strokeRect(-width / 2 - step, -height / 2 - step, width + step * 2, height + step * 2);
  }
  container.addAt(halo, 0);

  const tween = scene.tweens.add({
    targets: halo,
    alpha: { from: 1, to: HALO_PULSE_MIN },
    duration: HALO_PULSE_MS,
    ease: "Sine.easeInOut",
    yoyo: true,
    repeat: -1,
  });
  const destroy = (): void => {
    tween.remove();
    halo.destroy();
  };
  container.once(Phaser.GameObjects.Events.DESTROY, destroy);
  return {
    destroy: () => {
      container.off(Phaser.GameObjects.Events.DESTROY, destroy);
      destroy();
    },
  };
}

export function createRareFxToggle(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  width: number,
  height: number,
): (rare: boolean, color: number) => void {
  let shownColor: number | null = null;
  let fx: RareFx | null = null;
  return (rare, color) => {
    const next = rare ? color : null;
    if (next === shownColor) {
      return;
    }
    fx?.destroy();
    fx = next === null ? null : addRareFx(scene, container, width, height, next);
    shownColor = next;
  };
}
