import Phaser from "phaser";

const HALO_PEAK_ALPHA = 0.85;
const HALO_PULSE_MIN = 0.5;
const HALO_PULSE_MS = 900;
const SPARKLE_COLOR = 0xfff6c8;
const SPARKLE_CYCLE_MS = 1800;
const SPARKLE_FLASH_MS = 260;
const SPARKLE_SPOTS: readonly { fx: number; fy: number }[] = [
  { fx: -0.5, fy: -0.5 },
  { fx: 0.18, fy: -0.5 },
  { fx: 0.5, fy: -0.12 },
  { fx: 0.5, fy: 0.5 },
  { fx: -0.22, fy: 0.5 },
  { fx: -0.5, fy: 0.15 },
];

export type RareFx = { destroy: () => void };

function drawSparkle(scene: Phaser.Scene, arm: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(SPARKLE_COLOR, 1);
  g.fillRect(-1, -arm, 2, arm * 2);
  g.fillRect(-arm, -1, arm * 2, 2);
  g.fillStyle(0xffffff, 1);
  g.fillRect(-1, -1, 2, 2);
  return g;
}

export function addRareFx(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  width: number,
  height: number,
  color: number,
  sparkleCount = SPARKLE_SPOTS.length,
): RareFx {
  const reach = Math.max(4, Math.round(Math.min(width, height) * 0.12));
  const halo = scene.add.graphics();
  for (let step = 1; step <= reach; step += 1) {
    const falloff = 1 - step / (reach + 1);
    halo.lineStyle(1, color, HALO_PEAK_ALPHA * falloff * falloff);
    halo.strokeRect(-width / 2 - step, -height / 2 - step, width + step * 2, height + step * 2);
  }
  container.addAt(halo, 0);

  const arm = Math.max(3, Math.round(reach * 0.5));
  const sparkles = SPARKLE_SPOTS.slice(0, sparkleCount).map(({ fx, fy }) =>
    drawSparkle(scene, arm)
      .setPosition(fx * width, fy * height)
      .setScale(0)
      .setAlpha(0),
  );
  container.add(sparkles);

  const tweens = [
    scene.tweens.add({
      targets: halo,
      alpha: { from: 1, to: HALO_PULSE_MIN },
      duration: HALO_PULSE_MS,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    }),
    ...sparkles.map((sparkle, i) =>
      scene.tweens.add({
        targets: sparkle,
        scale: { from: 0, to: 1 },
        alpha: { from: 0, to: 1 },
        angle: { from: 0, to: 45 },
        duration: SPARKLE_FLASH_MS,
        ease: "Sine.easeOut",
        yoyo: true,
        delay: (i * SPARKLE_CYCLE_MS) / sparkles.length,
        repeat: -1,
        repeatDelay: SPARKLE_CYCLE_MS - SPARKLE_FLASH_MS * 2,
      }),
    ),
  ];
  const objects = [halo, ...sparkles];
  const destroy = (): void => {
    for (const tween of tweens) {
      tween.remove();
    }
    for (const object of objects) {
      object.destroy();
    }
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
