import type Phaser from "phaser";
import { categoryForSfx, effectiveVolume, type AudioSettings } from "../../domain/audioSettings";
import { loadAudioSettings } from "../storage/audioSettingsStorage";

import type { SfxId } from "../../domain/sfxId";

export type { SfxId };

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
  gameplayMusic: {
    key: "gameplay-music",
    url: "sound/game-play.ogg",
    volume: 1.0,
  },
  menuMusic: {
    key: "menu-music",
    url: "sound/menu.ogg",
    volume: 0.7,
  },
  storeMusic: {
    key: "store-music",
    url: "sound/store.ogg",
    volume: 1.0,
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
  revive: {
    key: "revive",
    url: "sound/revive.ogg",
    volume: 0.6,
  },
};

const SFX_PREVIEW_ID: SfxId = "pelletMunch";

export function pelletCollectSfxId(pickupNumber: number): SfxId {
  return pickupNumber > 0 && pickupNumber % 2 === 0 ? "pelletMunch2" : "pelletMunch";
}

export function loadsInBackground(id: SfxId): boolean {
  return categoryForSfx(id) === "music";
}

export function preloadSfx(scene: Phaser.Scene): void {
  if (scene.game.config.audio.noAudio === true) {
    return;
  }
  for (const [id, entry] of Object.entries(SFX_MANIFEST) as [SfxId, SfxEntry][]) {
    if (!loadsInBackground(id)) {
      scene.load.audio(entry.key, entry.url);
    }
  }
}

function loadedEventName(entry: SfxEntry): string {
  return `filecomplete-audio-${entry.key}`;
}

function loadThenStartLoop(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  if (scene.game.config.audio.noAudio === true) {
    return;
  }
  scene.load.audio(entry.key, entry.url);
  scene.load.once(loadedEventName(entry), () => startLoopingSfx(scene, id));
  scene.load.start();
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
  const volume = categoryVolume(loadAudioSettings(), id);
  if (volume <= 0) {
    return;
  }
  if (!scene.cache.audio.exists(entry.key)) {
    loadThenStartLoop(scene, id);
    return;
  }
  if (scene.sound.isPlaying(entry.key)) {
    return;
  }
  scene.sound.play(entry.key, { volume, loop: true });
}

export function stopLoopingSfx(scene: Phaser.Scene, id: SfxId): void {
  const entry = SFX_MANIFEST[id];
  scene.load.off(loadedEventName(entry));
  scene.sound.stopByKey(entry.key);
}

export function isSfxPlaying(scene: Phaser.Scene, id: SfxId): boolean {
  const entry = SFX_MANIFEST[id];
  return scene.cache.audio.exists(entry.key) && scene.sound.isPlaying(entry.key);
}

export function musicIdForContext(returnScene: string): SfxId {
  return returnScene === "PauseScene" ? "gameplayMusic" : "menuMusic";
}

export function playSfxPreview(scene: Phaser.Scene, settings: AudioSettings): void {
  const entry = SFX_MANIFEST[SFX_PREVIEW_ID];
  if (!scene.cache.audio.exists(entry.key)) {
    return;
  }
  const volume = categoryVolume(settings, SFX_PREVIEW_ID);
  if (volume <= 0) {
    return;
  }
  scene.sound.stopByKey(entry.key);
  scene.sound.play(entry.key, { volume });
}

export function syncMusicPlayback(scene: Phaser.Scene, id: SfxId, settings: AudioSettings): void {
  const entry = SFX_MANIFEST[id];
  const volume = categoryVolume(settings, id);
  if (volume <= 0) {
    stopLoopingSfx(scene, id);
    return;
  }
  if (!scene.cache.audio.exists(entry.key)) {
    loadThenStartLoop(scene, id);
    return;
  }
  if (scene.sound.isPlaying(entry.key)) {
    const playing = scene.sound.get<Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound>(
      entry.key,
    );
    playing?.setVolume(volume);
    return;
  }
  scene.sound.play(entry.key, { volume, loop: true });
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
