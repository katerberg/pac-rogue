import type Phaser from "phaser";
import {
  categoryForSfx,
  effectiveVolume,
  type AudioCategory,
  type AudioSettings,
} from "../../domain/audioSettings";
import { loadAudioSettings } from "../storage/audioSettingsStorage";

export type SfxId = "pelletMunch" | "pelletMunch2" | "siren" | "levelComplete" | "death";

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
  death: {
    key: "death",
    url: "sound/death.ogg",
    volume: 0.4,
  },
};

const MUSIC_PREVIEW_DURATION_MS = 1000;
const PREVIEW_SFX: Record<AudioCategory, SfxId> = {
  music: "siren",
  sfx: "pelletMunch",
};

export function pelletCollectSfxId(pickupNumber: number): SfxId {
  return pickupNumber > 0 && pickupNumber % 2 === 0 ? "pelletMunch2" : "pelletMunch";
}

export function preloadSfx(scene: Phaser.Scene): void {
  if (scene.game.config.audio.noAudio === true) {
    return;
  }
  for (const entry of Object.values(SFX_MANIFEST)) {
    scene.load.audio(entry.key, entry.url);
  }
}

function categoryVolume(settings: AudioSettings, id: SfxId): number {
  const category = categoryForSfx(id);
  if (category === "music") {
    return effectiveVolume(SFX_MANIFEST[id].volume, settings.musicEnabled, settings.musicLevel);
  }
  return effectiveVolume(SFX_MANIFEST[id].volume, settings.sfxEnabled, settings.sfxLevel);
}

export function playSfx(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  if (!scene.cache.audio.exists(entry.key)) {
    return;
  }
  const volume = categoryVolume(loadAudioSettings(), id);
  if (volume <= 0) {
    return;
  }
  scene.sound.play(entry.key, { volume });
}

export function startLoopingSfx(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  if (!scene.cache.audio.exists(entry.key) || scene.sound.isPlaying(entry.key)) {
    return;
  }
  const volume = categoryVolume(loadAudioSettings(), id);
  if (volume <= 0) {
    return;
  }
  scene.sound.play(entry.key, { volume, loop: true });
}

export function stopLoopingSfx(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  scene.sound.stopByKey(entry.key);
}

export function isSfxPlaying(scene: Phaser.Scene, id: SfxId): boolean {
  return scene.sound.isPlaying(SFX_MANIFEST[id].key);
}

const musicPreviewTimers = new WeakMap<Phaser.Scene, Phaser.Time.TimerEvent>();

export function stopMusicVolumePreview(scene: Phaser.Scene): void {
  musicPreviewTimers.get(scene)?.remove(false);
  musicPreviewTimers.delete(scene);
  stopLoopingSfx(scene, "siren");
}

export function playVolumePreview(
  scene: Phaser.Scene,
  settings: AudioSettings,
  category: AudioCategory,
): void {
  const id = PREVIEW_SFX[category];
  const entry = SFX_MANIFEST[id];
  if (!scene.cache.audio.exists(entry.key)) {
    return;
  }
  const volume = categoryVolume(settings, id);
  if (volume <= 0) {
    return;
  }
  if (category === "music") {
    stopMusicVolumePreview(scene);
    scene.sound.play(entry.key, { volume, loop: true });
    const timer = scene.time.delayedCall(MUSIC_PREVIEW_DURATION_MS, () => {
      scene.sound.stopByKey(entry.key);
      musicPreviewTimers.delete(scene);
    });
    musicPreviewTimers.set(scene, timer);
    return;
  }
  scene.sound.stopByKey(entry.key);
  scene.sound.play(entry.key, { volume });
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
