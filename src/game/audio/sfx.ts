import type Phaser from "phaser";

export type SfxId = "pelletMunch" | "pelletMunch2" | "siren" | "levelComplete";

type SfxEntry = {
  key: string;
  url: string;
  volume: number;
};

const SFX_MANIFEST: Record<SfxId, SfxEntry> = {
  pelletMunch: {
    key: "pellet-munch",
    url: "sound/pickup1.ogg",
    volume: 0.5,
  },
  pelletMunch2: {
    key: "pellet-munch2",
    url: "sound/pickup2.ogg",
    volume: 0.5,
  },
  siren: {
    key: "siren",
    url: "sound/siren.ogg",
    volume: 0.3,
  },
  levelComplete: {
    key: "level-complete",
    url: "sound/levelComplete.ogg",
    volume: 0.6,
  },
};

export function pelletCollectSfxId(pickupNumber: number): SfxId {
  return pickupNumber > 0 && pickupNumber % 2 === 0 ? "pelletMunch2" : "pelletMunch";
}

export function preloadSfx(scene: Phaser.Scene): void {
  for (const entry of Object.values(SFX_MANIFEST)) {
    scene.load.audio(entry.key, entry.url);
  }
}

export function playSfx(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  if (!scene.cache.audio.exists(entry.key)) {
    return;
  }
  scene.sound.play(entry.key, { volume: entry.volume });
}

export function startLoopingSfx(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  if (!scene.cache.audio.exists(entry.key) || scene.sound.isPlaying(entry.key)) {
    return;
  }
  scene.sound.play(entry.key, { volume: entry.volume, loop: true });
}

export function stopLoopingSfx(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  scene.sound.stopByKey(entry.key);
}

export function playPelletCollectSfx(
  scene: Phaser.Scene,
  previousCollected: number,
  removed: number,
  powerRemoved = 0,
): void {
  const regularRemoved = Math.max(0, removed - powerRemoved);
  for (let i = 1; i <= regularRemoved; i += 1) {
    playSfx(scene, pelletCollectSfxId(previousCollected + i));
  }
  for (let i = 0; i < powerRemoved; i += 1) {
    playSfx(scene, "pelletMunch");
    playSfx(scene, "pelletMunch2");
  }
}
