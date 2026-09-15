import type Phaser from "phaser";

export type SfxId = "pelletMunch" | "pelletPickup2";

type SfxEntry = {
  key: string;
  url: string;
  volume: number;
};

const SFX_MANIFEST: Record<SfxId, SfxEntry> = {
  pelletMunch: {
    key: "pellet-munch",
    url: "sound/zapsplat-munch.ogg",
    volume: 0.5,
  },
  pelletPickup2: {
    key: "pellet-pickup2",
    url: "sound/pickup2.ogg",
    volume: 0.5,
  },
};

export function pelletCollectSfxId(pickupNumber: number): SfxId {
  return pickupNumber > 0 && pickupNumber % 2 === 0 ? "pelletPickup2" : "pelletMunch";
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

export function playPelletCollectSfx(
  scene: Phaser.Scene,
  previousCollected: number,
  removed: number,
): void {
  for (let i = 1; i <= removed; i += 1) {
    playSfx(scene, pelletCollectSfxId(previousCollected + i));
  }
}
