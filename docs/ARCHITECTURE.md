# Architecture

Current shape of Dot-Man. Keep this document short and truthful — update it when the structure changes.

## Goals

- Fast local iteration (`npm run dev`).
- Hard verification before claiming work is done (`npm run verify`, including `check:ecs`).
- Small, composable modules over frameworks-of-frameworks.
- ECS (bitecs 0.4) is the gameplay model: components are data, systems are behavior, scenes only wire and tick.

## Layout

```text
src/
  main.ts                     # Phaser.Game bootstrap only
  styles.css                  # Page chrome around the canvas
  domain/                     # Pure helpers (no Phaser, no bitecs world APIs)
    clamp.ts
    circles.ts                # circle overlap tests
    countdown.ts
    runClock.ts
    pelletProgress.ts
    pelletToPower.ts           # pick one regular pellet eid for Pellet Surge
    fruit.ts                  # bonus fruit kinds, 70/170 presence clock
    upgrades.ts               # run upgrade defs + RunUpgrades helpers
    runHistory.ts
    highScoresView.ts
    scoreListScroll.ts
    playfield.ts              # speeds, sizes, drawable ids
    maze.ts                   # active layout grids/helpers, wall path cmds, activateLayout / activateAsciiLayout
    mazeLayouts.ts            # maze1/maze2/mazeSmall ASCII, pickLayoutId / parseMazeParam
    mazeTiling.ts             # 9×11 mirrored polyomino tiling solver (procedural)
    mazeGenerate.ts           # tiling → 28×34 ASCII + board seed / level≥2 selection
    playfieldBounds.ts        # PLAYFIELD_WIDTH/HEIGHT (no maze import)
    runLevel.ts               # ?level= URL parse, clamped to MAX_LEVEL
    quartersFlag.ts           # ?quarters= URL parse (non-negative integer default count)
    levelRules.ts             # MAX_LEVEL (8), per-level speed mul (player + ghosts), roster, mode wave schedule
    soundFlag.ts              # agent-port mute; ?sound=1 opt-in
    playFlag.ts               # ?play=1 skips menu boot into PlayScene
    audioSettings.ts          # music/SFX enable + 0..10 levels; effectiveVolume
    ghostPath.ts              # intersection direction pick + reverse helper
    ghostMovement.ts          # phase solids, one-way enter, L reverse redirect
    ghostKind.ts              # blinky / pinky / inky / clyde kind ids
    ghostTarget.ts            # Blinky/Pinky/Inky/Clyde chase/scatter/Elroy target tiles
    ghostPhase.ts             # inHouse / leaving / active phase ids
    ghostMode.ts              # level-scheduled scatter/chase wave clock + scatter-burst pause
    ghostRelease.ts           # per-kind time delays + Inky/Clyde pellet / post-life leave
    ghostHouseOrder.ts        # predicted in-house release sort (L→R seats)
    ghostHouseSeats.ts        # derived seat centers + sticky seat assign
    ghostHouseLeave.ts        # leaving: door-col approach then exit
    ghostSpeed.ts             # base / Elroy (Blinky) / tunnel speed resolve
    ghostRecall.ts            # closest eligible ghost pick for house recall
    deathSequence.ts          # catch → hold / ready / game-over timing
    lives.ts                  # START_LIVES + livesRemainingAfterCatch + livesHudIconCount
    corruption.ts             # level-4+ ghost corruption defs + RunCorruption state
    ghostTrail.ts             # generic trailing-tile FIFO (slime trail)
    wallPhaseDash.ts          # pure 2-thick-wall lunge target lookup
    seenRecord.ts             # ghosts/corruptions met in play (LEARN unlocks) + learnAll flag
    learnOverlay.ts           # LEARN reticle clamp, predicted path, target derivation, segment clip
  game/
    config.ts                 # Phaser GameConfig (FIT scale + pixelArt)
    audio/sfx.ts              # SFX manifest (incl. menuMusic / gameplayMusic loops); volumes scaled by audioSettings
    components/               # data only — no Phaser
      Position.ts
      Velocity.ts
      Input.ts
      Facing.ts
      Speed.ts
      Player.ts
      Ghost.ts
      GhostKind.ts
      GhostPhase.ts
      Wall.ts
      Pellet.ts
      PowerPellet.ts
      Fruit.ts
      Drawable.ts
    storage/
      runHistoryStorage.ts    # localStorage adapter for death-run history
      audioSettingsStorage.ts # localStorage adapter for music/SFX prefs
      seenRecordStorage.ts    # localStorage adapter for the LEARN seen record
    systems/
      playerInput.ts          # Phaser keys → sticky Input
      ghostRelease.ts         # inHouse → leaving (time or Inky/Clyde pellets)
      ghostHouseSeating.ts    # inHouse seat steer + snap at predicted seats
      ghostAi.ts              # kind target tile → sticky Input (once per tile); corruption opts for freeRetargetReverse/falseScatter; resolveGhostTarget
      ghostSpeed.ts           # Speed from Elroy (Blinky) + tunnel + upgrade mul / closest-ghost freeze / speed-surge mul
      ghostReverse.ts         # mode-change reverse via Input; skips a falseScatter-corrupted eid
      ghostExitHouse.ts       # leaving → active once off house/door tiles
      ghostRecall.ts          # power-pellet house teleport into inHouse seat
      ghostFreeze.ts          # power-pellet freeze closest leaving/active ghost
      corruptionGhost.ts      # find the corrupted ghost's current eid by kind
      corruptionStep.ts       # wall-phase → slime trail → pellet dropper → invisibility (PlayScene + LearnScene)
      wallPhaseDash.ts        # tick cycle/flash + relocate the corrupted ghost past a thin wall
      slimeTrail.ts           # track the corrupted ghost's trailing hazard tiles
      slimeTrailKill.ts       # circle overlap vs. slime trail tiles → caught
      pelletDropperTrail.ts   # every interval, flash then drop pellets one at a time behind the ghost
      ghostInvisibility.ts    # tick hidden/flash cycle + proximity reveal
      movement.ts             # Facing + collision (per-eid Speed + solids)
      catchPlayer.ts          # circle overlap → caught (skip frozen eid or player invulnerable)
      collectPellets.ts
      collectFruit.ts
      pelletToPower.ts        # Pellet Surge: convert one regular → power
      playerSpeed.ts          # Player Speed from base × upgrade mul
      playerDirection.ts
      playerWarp.ts           # power-pellet warp to dynamic top-center
      render.ts               # sprites + rounded wall stroke; preloadPlayArt
    scenes/
      pixelFont.ts            # RetroFont BitmapText helpers + VGA 8x8 atlas
      font8x8Basic.ts         # public-domain IBM VGA glyph bitmaps (U+0020..7E)
      upgradeChoiceModal.ts   # level-clear pick-one overlay (Phaser)
      MenuScene.ts            # boot title + Start / Learn / High Scores / Settings (no ECS)
      HighScoresScene.ts      # localStorage scores list + scroll (no ECS)
      SettingsScene.ts        # music/SFX checkboxes + 0..10 notches (no ECS)
      PauseScene.ts           # Escape overlay: Resume / Settings / Quit confirm (no ECS)
      PlayScene.ts            # preload art, createWorld, spawn, HUD, pipeline
      LearnScene.ts           # LEARN sandbox: own world, one chosen ghost, live target overlay
  public/
  art/                        # Pac-Man / pellet / power-pellet / ghost / fruit PNGs
  sound/                      # SFX (pickups, level complete, death) + looping menu/game-play music
scripts/
docs/
```

## Ports

- Humans: `npm run dev` → 5173, `npm run preview` → 4173
- Agents: `npm run dev:agent` → 5174, preview/visual → 4174
- Agents may kill/restart only their ports.
- Agent ports disable audio unless `?sound=1` (`src/domain/soundFlag.ts` → `gameConfig.audio.noAudio`).

## Scenes

Boot order in `gameConfig.scene`: `MenuScene` (first = entry), `LearnScene`, `HighScoresScene`, `SettingsScene`, `PlayScene`, `PauseScene`. With `?play=1`, `PlayScene` is first so boot skips the menu (Game Over still returns to `MenuScene`).

```text
MenuScene --Start--> PlayScene
MenuScene --Learn--> LearnScene --Back/Escape--> MenuScene
MenuScene --High Scores--> HighScoresScene
MenuScene --Settings--> SettingsScene
HighScoresScene --Back--> MenuScene
SettingsScene --Back--> MenuScene (or whichever scene launched it, see below)
PlayScene --Escape--> PauseScene (PlayScene paused; game-play music keeps playing)
PauseScene --Resume--> PlayScene resumes immediately
PauseScene --Settings--> SettingsScene --Back--> PauseScene (PlayScene stays paused throughout)
PauseScene --Quit, confirm Yes--> MenuScene (PlayScene stopped; no high-score write)
PlayScene --pellet clear, level 1--> level-complete SFX → brief freeze → next procedural maze (carry lives/upgrades/lifetime)
PlayScene --pellet clear, levels 2-7--> level-complete SFX → upgrade-choice modal (if eligible) → brief freeze → next board
PlayScene --pellet clear, level 8--> level-complete SFX → brief freeze → RUN COMPLETE → MenuScene (no upgrade offer)
PlayScene --caught (lives left)--> death hold → reset → ready → resume
PlayScene --caught (last life)--> death hold → fade → GAME OVER → MenuScene
```

**ECS ownership:** only `PlayScene` and `LearnScene` call `createWorld` / `addEntity` and run a system pipeline (`LearnScene`'s is a reduced chase-only sandbox; see [docs/learn.md](./learn.md)). `MenuScene`, `HighScoresScene`, `SettingsScene`, and `PauseScene` are Phaser presentation + input only (BitmapText, keyboard, pointer). Do not put bitecs in UI scenes.

Pausing (Escape) is available at any point during `PlayScene`, including mid-death-sequence, mid-level-transition, and while the level-clear upgrade-choice modal is open — `scene.pause()` halts `PlayScene.update()` entirely, so whichever of those states was active simply freezes and resumes exactly where it left off; `scene.pause()` never touches the Sound Manager, so the game-play music loop keeps playing unattended through the pause menu. `SettingsScene` accepts an optional `returnScene` value (Phaser scene init data) so it can return to either `MenuScene` (default) or `PauseScene` depending on how it was opened; `PlayScene` itself is never restarted by this round trip. `PauseScene`'s Quit option turns into an inline `SURE?  YES  NO` on the same row (default focus: NO); Up cancels the confirm and moves focus to Settings, same as a normal Up from the Quit row. Confirming Yes stops `PlayScene` (its existing `SHUTDOWN` handler covers game-play music/modal/banner cleanup) without ever calling `saveRun`.

High Scores reads `loadRunHistory()` and builds a **display-only** sorted view via `highScoresView` (collected pellets desc, then remaining time desc). Storage remains chronological append order.

Settings reads/writes `audioSettings` via `audioSettingsStorage` (`pac-rogue.audio-settings.v1`). **Music** scales whichever music track is currently playing (`menuMusic` or `gameplayMusic` — see below); **SFX** scales every other clip. Adjusting the Music slider or toggling Music on/off (`syncMusicPlayback` in `game/audio/sfx.ts`) directly starts, stops, or re-volumes the live track instead of playing a separate preview clip; the SFX slider still plays a one-shot `pelletMunch` preview on change. `SettingsScene` resolves which track it controls via `musicIdForContext(returnScene)`: `gameplayMusic` when opened from `PauseScene`, `menuMusic` otherwise. Agent `noAudio` still wins for playback; Settings stays editable and shows `AUDIO DISABLED` when muted.

Two looping music tracks share the `"music"` audio category: `menuMusic` (`sound/menu.ogg`) plays continuously across `MenuScene`, `LearnScene`, `HighScoresScene`, and `SettingsScene` (when opened from the menu) — each of those scenes starts it (idempotently) in `create()`, so navigating between them never restarts or glitches it. `gameplayMusic` (`sound/game-play.ogg`, the id was previously named `siren`) plays only during `PlayScene`, including while `PauseScene` is open on top of it; `PlayScene.create()` stops `menuMusic` as its first action so the two tracks never overlap.

## Game loop

```text
PlayScene.update →
  (if dying: tickDeathSequence → handle events (reset / fade / GO / resume / menu); return; no sim)
  (if run complete: tick hold → MenuScene; return)
  (if level transition: tick pause → advance board (level < 8) or begin run complete (level 8); return)
  (if upgrade modal active: tick modal; return until outro done → suppress input until key release)
  (if pending level clear: start level transition; return)
  playerInput →
  tickGhostRelease + ghostHouseSeating + ghostRelease (boardCollected + afterLifeRelease gates Inky/Clyde) →
  tickFreeze + tickScatterBurst + tickWallPass → (wall-pass expire → snapPlayerToNearestWalkable) → tickInvuln + tickSpeedBurst + tickSpeedSurge → applyPlayerSpeed → applyGhostSpeed (level mul × upgrade mul + closest-ghost freeze + speed-surge mul; skips inHouse) →
  movement (optional player solids override while wall-pass active) →
  stepCorruption (tickWallPhaseDash + tickSlimeTrail + tickPelletDropperTrail + tickInvisibility; spawnDroppedPellets if any) →
  ghostExitHouse (startGhostModeClock once if inactive) →
  tickRunClock →
  collectPellets → releaseDrawable(removed) → applyPowerPelletEffects → freezeClosestGhost? →
  collectExtraPellets? → releaseDrawable(bonus) → applyPelletCollect(touch+bonus) →
  resolveGhostModeStep (pause wave while scatter burst + clock active) →
  (effective mode changed ? forceGhostReverse[skips falseScatter eid] : ghostAi[corruption opts for freeRetargetReverse/falseScatter]) →
  recallClosestGhost? → warpPlayerTopCenter? →
  tickFruitPresence (boardCollected; spawn/replace/despawn) →
  collectFruit → releaseDrawable(removed) → munch SFX + award Quarters (fruit has no upgrade effect) →
  (if board clear: level-complete SFX → levels 1 and 8: level transition; levels 2-7: pickUpgradeChoiceOffer → modal (pending level clear) always opens (up/left/right upgrades + down Quarters); return)
  catchPlayer (skip frozen eid or player invulnerable) OR slimeTrailKill →
  render (closest-ghost freeze tint; corruption outline/flash tint + hidden alpha; slime trail tiles; player wall-pass tint or invuln gold tint) →
  (if caught: stop game-play music, play death, spend life, begin death sequence)
```

From level 4+, `maybeAssignCorruption` runs once per `startBoard()` call to pick (or lock in a forced)
ghost + corruption; see [docs/corruption.md](./corruption.md). Each `startBoard()` also merges the spawned ghost kinds and the assigned corruption into the LEARN seen record (`pac-rogue.seen.v1`).

While the upgrade choice modal is active, `PlayScene.update` early-returns after ticking the modal (full sim freeze), same family as the death sequence halt. It is opened only on a level 2-7 clear (never by fruit; `offersUpgradeAfterLevel`); level 1's and level 8's clears and any level-clear with no eligible upgrades skip straight to the level transition.
See also [docs/upgrades.md](./upgrades.md) and [docs/levels.md](./levels.md).

1. `preload()`: pac-man frames, pellet + power-pellet art, Blinky + Pinky + Inky + Clyde, bonus fruit art, SFX.
2. `create()`: optional `?maze=maze1|maze2|mazeSmall` (else level 1 → `mazeSmall`; level 2+ → procedural ASCII via `mazeGenerate`), `?level=` (else 1; clamped to `MAX_LEVEL` = 8), and `?quarters=` (else 0), then board spawn (world, walls, pellets, player, ghosts from `ghostKindsForLevel(levelIndex, secondGhostKind)` — level 1: Blinky + `secondGhostKind` (Pinky or Inky, picked 50/50 once per run at `create()`); level 2: Blinky + `secondGhostKind` + the other of Pinky/Inky (Blinky, Pinky, Inky); level 3+: all four), HUD (Quarters icon row, Time, lives icons, upgrade strip), `LEVEL N` fade banner, `lives = START_LIVES`, `RunUpgrades` from URL flags (`enableUpgrade` — see [README Flags](../README.md#flags)), game-play music.
3. Rectangular ASCII layouts (classic `maze1` / `maze2` are 28×31; level-1 `mazeSmall` is 22×21; generated boards are 28×34). Size band and fit gates: [docs/maze-constraints.md](./maze-constraints.md). Ghost house / door are carved in ASCII (`=` door, `H` floor; empty corridor `-` or space; optional `P` spawn). House spawn/exit and fruit cell are **derived** from ASCII; tunnels from edge walkability. `getActiveLayout().playerSolids` blocks the house; `ghostSolids` allows it. Helpers read the active layout set by `activateLayout` / `activateAsciiLayout` (syncs `MAZE_COLS` / `TILE_SIZE` / offsets).
4. House seats / release: in-house ghosts sit in four derived L→R seats on the spawn row (`ghostHouseSeatCenters`), ordered by **predicted** release (`ghostHouseOrder`). `ghostHouseSeating` animates reseating when that order changes (sticky: no cosmetic compact after someone leaves). Shared release clock starts on first player direction input for Blinky (`BLINKY_RELEASE_DELAY_MS` = 100) and Pinky (`PINKY_RELEASE_DELAY_MS` = 5000). Inky leaves when **board** `boardCollected >=` layout-scaled pellets (maze1 baseline `BASE_INKY_RELEASE_PELLETS` = 30) on the first life of a board; after a life loss (`afterLifeRelease`), Inky uses `INKY_POST_LIFE_RELEASE_DELAY_MS` (7000) on the fresh release clock instead. Clyde leaves when **board** `boardCollected >=` layout-scaled pellets (maze1 baseline `BASE_CLYDE_RELEASE_PELLETS` = 60) on the first life of a board; after a life loss (`afterLifeRelease`), Clyde uses `CLYDE_POST_LIFE_RELEASE_DELAY_MS` (9000) on the fresh release clock instead. Leaving ghosts first steer to the door column, then up to the exit. First ghost to leave house/door tiles → `active` and **start mode waves once** from `ghostModeWavesForLevel(levelIndex)` (level 1: chase-only forever; level 2+: arcade chase-first table, skipping the opening scatter). Later exits do not restart the clock.
5. Targeting: Blinky chase / Elroy → player tile; Blinky scatter → `(cols-3, -3)`. Pinky chase → 4 tiles ahead of player facing (`Facing.none` → left); Pinky scatter → `(2, -3)`. Inky chase → doubled vector from Blinky’s tile through a clean 2-tile Pac look-ahead (`Facing.none` → left; missing Blinky → house spawn tile); Inky scatter → `(cols-1, rows+2)`. Clyde chase → player tile when Euclidean tile distance `≥ CLYDE_SHY_TILES` (8), else Clyde scatter `(0, rows+2)`; Clyde scatter mode → same SW corner. Scatter corners scale with layout size (classic 28×31 matches the old absolute tiles). Delays and shy radius are tunable named constants. Steering: min squared distance at cell centers (tie: up > left > down > right); no voluntary reverse at Ls.
6. Speeds (vs `PLAYER_SPEED`): Maze-Man and ghosts both × `speedLevelMultiplier(levelIndex)` (`1 + 0.05×(level−1)`) each frame. Ghosts: base × `ghostBaseSpeedRatio(levelIndex)` (`0.8` at level 1, +0.05/level, pinned at `1.0` from level 5 on — ghosts start 20% slower than Maze-Man and catch up to parity by level 5); tunnel 0.5× that same ramped base (so tunnel speed also scales level 1→5); Elroy1/2 only for Blinky and unaffected by the ramp (layout-scaled remaining-pellet cutoffs; maze1 ≤20 / ≤10 → 1.0× / 1.0625× `PLAYER_SPEED` flat); then × level mul × run upgrade muls (`playerSpeedUp` / `ghostSlow`). Closest-ghost freeze sets that leaving/active ghost’s speed to 0.
7. Catch: circle overlap while any ghost is `leaving` or `active` → stop game-play music, play death SFX, spend one life. Full pipeline halt for `DEATH_HOLD_MS` (845, knob). If lives remain: reset player/ghosts to start/house, despawn fruit, clear freeze/scatter-burst/wall-pass/invuln/speed-burst timers, reset release/mode clocks, set `afterLifeRelease`, `READY_PAUSE_MS` (1000) freeze, then resume (game-play music on); run/release clocks wait for direction again (`RunClock.started = false`); no high-score write. If last life: append high-score run (**lifetime** pellets + remaining countdown) unless a debug flag (`infiniteLives` or `disableLevelUpgrades`) is active for this run, then 500ms black fade (visual only) → `GAME OVER` + lifetime collected for `GAME_OVER_HOLD_MS` (2000) → `MenuScene`. Skipped for the frozen closest ghost or while player invuln is active; thaw/expiry while overlapping still kills.
8. Pellet clear: level-complete SFX (no history write). Level 1: brief transition freeze straight into the next board. Levels 2-7: the pick-one upgrade-choice modal always opens first — up to three eligible upgrades at the up/left/right slots plus an always-available Quarters option at the down slot (see [docs/upgrades.md](./upgrades.md)) — and the transition freeze starts only after it resolves. Level 8: no upgrade offer; the transition freeze is followed by a `RUN COMPLETE` screen (`RUN_COMPLETE_HOLD_MS` = 2000) and a return to `MenuScene` instead of a next board. Advancing rebuilds a **procedural** maze in the same `PlayScene` (carry lives, owned upgrades, lifetime Collected, Quarters; reset board pellet progress, clocks, fruit, freeze/scatter/wall-pass/invuln/speed-burst timers; Time back to 999; `LEVEL N` banner fades). Power pellets play both munches and stay inert unless an owned upgrade reacts. `render` draws rounded wall stroke from maze knobs, pac-man chomp, pellets, ghosts (cyan tint on the frozen closest ghost), bonus fruit, and tunnel twin (player wall-pass tint while active; else darker-gold invuln tint that blinks in the last second).
9. Bonus fruit: level 1 spawns a single fruit after 70 **board** pellets are collected (unscaled — mazeSmall's pellet count is well above 70, so no second fruit fires); from level 2+, after layout-scaled **board** pellet thresholds (maze1 70 and 170), spawn at the derived under-house fruit cell for 10 real seconds (Phaser `delta` ms); cherries use `strawberry.png` stand-in; pickup removes the entity, plays both munches, and awards one Quarter (top-left HUD dot; no gameplay value yet) — no upgrade effect (the upgrade choice comes from clearing the level, not from fruit; see item 8 and [docs/upgrades.md](./upgrades.md)).

## ECS boundary

| Layer                                                      | May import Phaser? | May mutate component arrays? | Role                |
| ---------------------------------------------------------- | ------------------ | ---------------------------- | ------------------- |
| `game/components/**`                                       | No                 | Define storage only          | Data                |
| logic systems (`movement`, `ghostAi`, `collectPellets`, …) | No                 | Yes                          | Pure simulation     |
| `game/systems/playerDirection.ts`                          | No                 | No (reads `Input` only)      | Pure query helper   |
| `game/systems/playerInput.ts`, `render.ts`                 | Yes                | Yes (input / drawable sync)  | Bridges             |
| `game/scenes/**`                                           | Yes                | Spawn / init only            | Wire + run pipeline |
| `domain/**`                                                | No                 | No bitecs world APIs         | Pure helpers        |

`npm run verify` enforces this via ESLint `no-restricted-imports` and `npm run check:ecs`. Docs are not the gate.

## Anti-abstraction rules

A violation of these is a failed architecture check:

- Phaser GameObjects are **not** the source of truth for position; they only mirror ECS `Position`.
- Sticky `Input` is written by `playerInput` / ghost AI / release / mode-reverse. `movement` updates `Facing`, `Velocity`, and `Position` in normal play; `forceGhostReverse` also sets both `Facing` and `Input` on scatter↔chase boundaries (and that frame skips `ghostAi` so the reverse is not overwritten).
- Scenes wire the world, spawn entities, and run the pipeline — **no movement or AI rules in the scene** beyond calling systems and domain clocks.
- Wall layout/collision comes from the domain maze grid; Wall entities carry `Position` for ECS presence; wall Graphics stroke rounded outlines from domain path commands.
- One local GameObject map inside the render bridge is enough — do not build a sync framework.
- Do not invent Entity/Component/System manager classes around bitecs.
- bitecs **0.4** only. No `bitecs/legacy`, no second ECS library.

## Principles

1. **Domain vs presentation** — Pure math, maze, and playfield helpers live in `src/domain`. Gameplay rules live in Phaser-free systems. Scenes gather input and present; they do not own simulation.
2. **Composition** — Prefer small functions and SoA components wired together. Do not introduce a god `GameManager` or global mutable singleton.
3. **Dependencies** — Add a package only with a concrete need. Prefer stdlib and existing tooling.
4. **Verification** — Automated checks (including `check:ecs`) and production build are mandatory. Gameplay/visual changes also require runtime inspection (see `docs/VERIFICATION.md`).

## Current runtime

- Boot lands on `MenuScene` (`DOT-MAN` title, Start / Learn / High Scores / Settings), or on `PlayScene` when `?play=1`. Start opens `PlayScene`; Learn opens `LearnScene` (see [docs/learn.md](./learn.md)); High Scores opens `HighScoresScene` (pellets + remaining time + date from localStorage; empty → `NO SCORES YET`; list viewport fills down to a clearance above Back; more rows than fit → pause-at-top then scroll with trail loop); Settings opens `SettingsScene` (music/SFX checkboxes + 0..10 notched volumes in localStorage). `MenuScene`, `LearnScene`, `HighScoresScene`, and `SettingsScene` (when opened from the menu) all loop `menuMusic` (`sound/menu.ogg`), started idempotently in each scene's `create()` so it plays continuously across all of them until a game actually starts.
- Only `PlayScene` and `LearnScene` own world creation and a system pipeline. UI scenes have no ECS.
- Escape during `PlayScene` always opens `PauseScene` (dims the paused board) — Resume returns control immediately; Settings reuses `SettingsScene` and returns to the pause menu; Quit turns its row into an inline `SURE?  YES  NO` (default NO, Up cancels back to Settings) and, if confirmed, ends the run and returns to `MenuScene` without writing a high-score entry. Pausing works mid-death-sequence, mid-level-transition, and mid-upgrade-modal alike, and `gameplayMusic` keeps playing throughout the pause menu (and any `SettingsScene` opened from it) since `scene.pause()` never touches audio.
- Rectangular maze (per-layout cols/rows; **fixed** tile size `TILE_SIZE_PX` (16px, same for every layout — Pac-Man/ghosts render at one consistent pixel size across all levels) centered under `MAZE_TOP_MARGIN_PX` in the leftover 800×600 band; reject if pixel width/height overflow the playfield or left gutter `< 80` — see [maze-constraints.md](./maze-constraints.md)) with stroked walls (rounded corners). Visual knobs live on `maze.ts`: `MAZE_TOP_MARGIN_PX`, `MAZE_BACKGROUND_COLOR`, `WALL_STROKE_COLOR`, `WALL_STROKE_WEIGHT`, `WALL_CORNER_RADIUS`, `WALL_CORNER_CURVE_MIN_STEPS`, `WALL_CORNER_CURVE_KIND`, `WALL_INSET_PX` (pull stroke into wall tiles), `PLAYER_WALL_PADDING_PX` (actor display size only), `pelletDisplaySize()` / `powerPelletDisplaySize()` (clamped to tile). Dual solids (player blocked from house/door; ghosts allowed), horizontal tunnels.
- One player entity (display size from wall padding; open mouth when idle) spawns in the lowest empty center maze cell, then moves continuously along centerlines with sticky next-direction turns; walls/exterior/house block travel; tunnels wrap with dual-draw while straddling.
- Regular pellets (`dot.png`) and power pellets (`power-pellet.png` on `@` cells) on playable cells; touching removes them, plays pickup SFX (both munches for power pellets; volumes from SFX settings), and increments an internal **lifetime** pellet count (board-local count drives Inky/Clyde/fruit/clear; lifetime count still feeds the Game Over screen and high scores, though it is no longer shown live — the top-left HUD is Quarters dots instead). Looping `gameplayMusic` (`sound/game-play.ogg`) plays during `PlayScene`, including while paused, until clear, catch, or shutdown (volume from music settings), then `MenuScene`'s `menuMusic` resumes; clearing all pellets plays level-complete SFX, then (levels 1 and 8) advances straight to the next board or Run Complete, or (levels 2-7) offers the level-clear upgrade choice first — see [docs/levels.md](./levels.md); catch plays death SFX then life-loss reset (or Game Over on the last life).
- Bonus fruit appears under the ghost house at board pellet thresholds: level 1 spawns one fruit after 70 pellets (unscaled, single threshold); from level 2+ it appears under the ghost house at board thresholds (maze1 70/170), lasts 10 real seconds, uses cherries (`strawberry.png` stand-in); pickup plays both munches, removes the fruit, and awards one Quarter (top-left HUD dot; no gameplay value yet) — no upgrade effect (see [docs/upgrades.md](./upgrades.md) for the level-clear upgrade modal).
- From level 4+, one random non-Blinky ghost permanently gains one random corruption for the rest of the run (silent trigger, persistent outline tint, telegraph flash on discrete activations) — see [docs/corruption.md](./corruption.md).
- Start with 3 lives, but `livesAfterLevelRegen` (`src/domain/lives.ts`) tops up by one life at level 1 and at every level transition whenever fewer than 3 HUD icons are showing — so every run effectively begins at 4 lives (3 icons), and a run that dropped below that floor trickles back up by one life per level clear (not an instant refill). This floor doesn't cap the `extraLife` upgrade, which can still push the icon count above 3. Bottom-left pac icons show remaining extras only (3 at run start, not the life in play); lives carry across level advances. Ghosts unlock by level (`ghostKindsForLevel`: level 1 Blinky only; level 2 Blinky + a randomly chosen Pinky or Inky picked once per run; level 3+ all four); only unlocked kinds are spawned. Present ghosts use predicted L→R house seats (not stacked); Blinky/Pinky time release after first input (0.1s / 5s — tunable); Inky leaves at board-scaled pellets (maze1 baseline 30) on the first life of a board, or after a 7s post-life time gate after a life loss; Clyde leaves at board-scaled pellets on the first life of a board, or after a 9s post-life time gate after a life loss; leave path approaches door column then up; chase-first arcade scatter/chase waves (L1 chase-only; L2+ arcade chase-first); Blinky Cruise Elroy; Inky Blinky-vector chase + SE scatter; tunnel slowdown; Maze-Man and ghosts gain +5% speed per level index via `speedLevelMultiplier`; ghosts additionally start at 80% of Maze-Man's base speed on level 1, ramping to full parity by level 5 via `ghostBaseSpeedRatio` (fixed 8-level plan — see [docs/levels.md](./levels.md)). Circle overlap spends a life (hold → reset actors / ready pause → resume) or last-life Game Over (hold → append high-score run → fade → `GAME OVER` + lifetime collected → menu) unless closest-ghost freeze walk-through or player invuln is active.
- Top-right `Time` countdown (999, −1/100ms after first input, clamp at 0; resets each level). Last-life Game Over appends **lifetime** pellets + remaining time + ISO date to capped `localStorage` run history (`pac-rogue.run-history.v2`, max 100, drop oldest), unless a debug flag (`infiniteLives` or `disableLevelUpgrades`) was active for the run. Clearing all pellets never writes history — including clearing level 8, which shows a `RUN COMPLETE` screen and returns to `MenuScene` instead of a next board.
- Domain helpers (`clamp`, `circles`, `countdown`, `runClock`, `runLevel`, `levelRules`, `pelletProgress`, `fruit`, `upgrades`, `runHistory`, `highScoresView`, `scoreListScroll`, `audioSettings`, `playfield`, `maze`, `lives`, `deathSequence`, ghost kind/path/movement/target/mode/release/house-order/seats/leave/speed) are Phaser-free; movement/collect/clock/progress/scroll/view/audioSettings/ghost/lives/deathSequence helpers are unit-tested without Phaser.
- Power pellets are inert unless an owned upgrade reacts (`powerPelletFreeze`, `scatterBurst`, `powerSpeedBurst`, `ghostRecall`, `warpTop`, `powerCollectThree` — see [docs/upgrades.md](./upgrades.md)). No arcade fright / eatable ghosts yet.
