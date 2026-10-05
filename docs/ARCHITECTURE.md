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
  main.ts                     # Phaser.Game bootstrap + installs the agent-port debug hook (see game/scenes/installDebugHook.ts)
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
    runLog.ts                 # run log schema + pure recorders (every PlayScene run; see docs/RUN_LOG.md)
    runLogFillFlag.ts         # ?runLogFill= parse (agent-port synthetic runs)
    highScoresView.ts
    scoreListScroll.ts
    playfield.ts              # speeds, sizes, drawable ids
    maze.ts                   # active layout grids/helpers, wall path cmds, activateLayout / activateAsciiLayout
    mazeLayouts.ts            # maze1/maze2/mazeSmall + store ASCII, pickLayoutId / parseMazeParam
    mazeTiling.ts             # 9×11 mirrored polyomino tiling solver (procedural)
    mazeGenerate.ts           # tiling → 28×34 ASCII + board seed / level≥2 selection
    playfieldBounds.ts        # PLAYFIELD_WIDTH/HEIGHT (no maze import)
    runLevel.ts               # ?level= URL parse, clamped to MAX_LEVEL
    playOptions.ts            # parsePlayOptions: every PlayScene URL flag → PlayOptions + warnings
    tuning.ts                 # Tuning (every ?knobs=1 knob) + DEFAULT_TUNING; stored-override parse/serialize; level speed ramps
    tuningKnobs.ts            # knob table (group, label, range/step/unit) the ?knobs=1 panels render from
    knobsFlag.ts              # ?knobs=1 parse
    wallStyle.ts              # wall color/thickness/glow/corner/background from the maze color setting or tuning
    runRandom.ts              # ?seed= parse + RunRandom: named seeded streams, the only allowed randomness source
    quartersFlag.ts           # ?quarters= URL parse (non-negative integer default count)
    store.ts                  # store floor schedule, slot parse, stock roll, prompt/purchase state machine
    storeRoute.ts             # store click-to-exit: tunnel cell under a click + BFS first step
    storeFlag.ts              # ?store=1|2|3 debug: start in the Nth store
    levelRules.ts             # MAX_LEVEL (9), per-level speed mul (player + ghosts), roster, mode wave schedule
    bossRules.ts              # boss table (level 9 → Double Blinky), BossState, ?bossGhosts parse
    bossBoard.ts              # boss tunnel-mouth rotation + boss pellet spread
    bossGhostBlocking.ts      # corridor occupancy walk (boss ghosts avoid each other)
    soundFlag.ts              # agent-port mute; ?sound=1 opt-in
    playFlag.ts               # ?play=1 boots into PlayScene, else ?learnAll=1/0 into LearnScene, else menu
    audioSettings.ts          # music/SFX enable + 0..10 levels; effectiveVolume
    ghostPath.ts              # intersection direction pick + reverse helper
    ghostMovement.ts          # phase solids, one-way enter, L reverse redirect
    ghostKind.ts              # blinky / pinky / inky / clyde kind ids
    ghostTarget.ts            # Blinky/Pinky/Inky/Clyde chase/scatter/Elroy target tiles
    ghostPhase.ts             # inHouse / leaving / active phase ids
    ghostMode.ts              # level-scheduled scatter/chase wave clock
    ghostRelease.ts           # per-level release rules: Blinky/Pinky timers, Inky/Clyde dot counts, post-death shared counter, idle timer
    ghostHouseOrder.ts        # predicted in-house release sort (L→R seats)
    ghostHouseSeats.ts        # derived seat centers + sticky seat assign
    ghostHouseLeave.ts        # leaving: door-col approach then exit
    ghostSpeed.ts             # base / Elroy (Blinky) / tunnel speed resolve
    eatDrag.ts                # brief eased Maze-Man slowdown after eating a dot / power pellet
    warpGlide.ts              # Warp Farthest / Scatter Burst: 500ms sprite glide + afterimages (visual only)
    speedTrail.ts             # Speed Burst: recent player positions → fading afterimages (visual only)
    turnTuning.ts             # Turn Tuning: turn-tap window/beat tests, turn speed-boost timer/multiplier, turn flash pulse
    ghostRecall.ts            # closest eligible ghost pick for house recall
    ghostCorner.ts            # Scatter Burst landing cell per ghost (corner, or house exit near the player)
    ghostCornerWarp.ts        # Scatter Burst per-ghost glide + post-landing hold
    deathSequence.ts          # catch → hold / ready / game-over timing
    lives.ts                  # START_LIVES + livesRemainingAfterCatch + livesHudIconCount
    seenRecord.ts             # ghosts/upgrades met in play (LEARN unlocks) + learnAll flag
    learnUpgradeColumns.ts    # LEARN upgrade school split (3 left / 3 right) + hover-preview anchor
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
      BossGhost.ts            # boss marker: scatter corner + house release delay
      BossPellet.ts           # boss pellet marker (eating one spawns a boss ghost)
    sim/                      # headless, Phaser-free run state + pipelines (Vitest-drivable)
      playSim.ts              # PlaySim: start / step(input, delta) → SimEvent[]; chooseUpgrade; snapshot
      learnSim.ts             # LearnSim: LEARN sandbox pipeline
      simEvents.ts            # SimEvent union (side effects the scene applies) + SimRenderOptions
      simInput.ts             # SimInput (HeldKeys, uiOpen, store toggle/confirm)
      simTesting.ts           # test harness: runFrames / runUntil / held at a fixed 1000/60 step
      runRecorder.ts          # RunRecorder: PlaySim's run-log draft (per-level counters, deaths, store, loadout)
    storage/
      runHistoryStorage.ts    # localStorage adapter for death-run history
      runLogStorage.ts        # run log: per-run localStorage keys + index, abandoned relabel, overrun/purge
      audioSettingsStorage.ts # localStorage adapter for music/SFX prefs
      seenRecordStorage.ts    # localStorage adapter for the LEARN seen record
      debugTuningStorage.ts   # localStorage adapter for ?knobs=1 overrides
    systems/
      heldKeys.ts             # HeldKeys (press times) → sticky Input; axis winner + diagonal combine
      playerInput.ts          # Phaser keys → HeldKeys (reader only)
      ghostRelease.ts         # inHouse → leaving (timer, dot counts, or idle push-out; returns whether a ghost left)
      ghostHouseSeating.ts    # inHouse seat steer + snap at predicted seats
      ghostAi.ts              # kind target tile → sticky Input (once per tile); resolveGhostTarget
      ghostSpeed.ts           # Speed from Elroy (Blinky) + tunnel + upgrade mul / closest-ghost freeze / speed-surge mul
      ghostReverse.ts         # mode-change reverse via Input
      ghostExitHouse.ts       # leaving → active once off house/door tiles
      ghostRecall.ts          # power-pellet house teleport into inHouse seat
      ghostCornerTeleport.ts  # Scatter Burst: warp active ghosts to their corners (returns glides)
      ghostFreeze.ts          # power-pellet freeze closest leaving/active ghost
      movement.ts             # Facing + collision (per-eid Speed + solids)
      bossGhosts.ts           # boss head-on reverse, free tunnel mouth pick, boss pellet count
      catchPlayer.ts          # circle overlap → catching ghost eid or null (skip frozen eid or player invulnerable)
      collectPellets.ts
      collectFruit.ts
      pelletToPower.ts        # Pellet Surge: convert one regular → power
      playerSpeed.ts          # Player Speed from base × upgrade mul
      playerDirection.ts
      playerWarp.ts           # power-pellet warp farthest from ghosts (returns the glide to animate)
      playerCell.ts           # player's current maze cell (store slot/exit lookup)
      playerSlide.ts          # store exit: move the player straight out a tunnel (no wrap)
      render.ts               # sprites + rounded wall stroke; preloadPlayArt
      worldSnapshot.ts        # read-only world → JSON for the agent debug snapshot (probe expect/waitFor)
    scenes/
      pixelFont.ts            # RetroFont BitmapText helpers + VGA 8x8 atlas
      font8x8Basic.ts         # public-domain IBM VGA glyph bitmaps (U+0020..7E)
      upgradeChoiceModal.ts   # level-clear pick-one overlay (Phaser)
      turnSparks.ts           # Turn Tuning feedback: perfect burst + close sparks (Phaser)
      storeOverlay.ts         # store floor tiles, hover/prompt panel, purchase toast (Phaser)
      knobsPanel.ts           # ?knobs=1 DOM panels over the canvas gutters + RESTART / RESET OPTIONS buttons
      MenuScene.ts            # boot title + Start / Learn / High Scores / Settings (no ECS)
      HighScoresScene.ts      # localStorage scores list + scroll (no ECS)
      SettingsScene.ts        # music/SFX checkboxes + 0..10 notches (no ECS)
      PauseScene.ts           # Escape overlay: Resume / Settings / Quit confirm (no ECS)
      RunLogOverrunScene.ts   # blocking RUN LOG FULL screen: purge the oldest 10 runs (no ECS)
      PlayScene.ts            # adapter: keys → PlaySim.step → apply SimEvents (sfx, render, HUD, modals, banners)
      LearnScene.ts           # LEARN adapter: slots/rows/overlay UI over LearnSim
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
- Agent ports expose a read-only `window.__PAC_ROGUE_DEBUG__.snapshot()` (`src/game/scenes/installDebugHook.ts` → `PlayScene.debugSnapshot()` → `PlaySim.snapshot()` + `worldSnapshot`) for `npm run probe` assertions; see [VERIFICATION.md](./VERIFICATION.md#game-state-snapshot).

## Scenes

Boot order in `gameConfig.scene`: `MenuScene` (first = entry), `LearnScene`, `HighScoresScene`, `SettingsScene`, `PlayScene`, `PauseScene`, `RunLogOverrunScene`. With `?play=1`, `PlayScene` is first so boot skips the menu (Game Over still returns to `MenuScene`).

```text
MenuScene --run log ≥500 runs or a failed save--> RunLogOverrunScene --purge below the cap--> MenuScene
MenuScene --Start--> PlayScene
MenuScene --Learn--> LearnScene --Back/Escape--> MenuScene
MenuScene --High Scores--> HighScoresScene
MenuScene --Settings--> SettingsScene
HighScoresScene --Back--> MenuScene
SettingsScene --Back--> MenuScene (or whichever scene launched it, see below)
PlayScene --Escape--> PauseScene (PlayScene paused; game-play music keeps playing)
PauseScene --Resume or Escape--> PlayScene resumes immediately
PauseScene --Settings--> SettingsScene --Back--> PauseScene (PlayScene stays paused throughout)
PauseScene --Quit, confirm Yes--> MenuScene (PlayScene stopped; no high-score write)
PlayScene --pellet clear, level 1--> level-complete SFX → brief freeze → next procedural maze (carry lives/upgrades/lifetime)
PlayScene --pellet clear, levels 2-8--> level-complete SFX → upgrade-choice modal (if eligible) → brief freeze → next board (level 9 = boss, `BOSS` banner)
PlayScene --pellet clear, level 9 (boss)--> level-complete SFX → brief freeze → RUN COMPLETE → MenuScene (no upgrade offer)
PlayScene --transition end after level 3 / 5-or-6 / 8--> store floor (see docs/store.md) --tunnel exit--> next level (after 8: the level-9 boss)
PlayScene --caught (lives left)--> death hold → reset → ready → resume
PlayScene --caught (last life)--> death hold → fade → GAME OVER → MenuScene
```

**ECS ownership:** only the headless sims in `src/game/sim/` (`PlaySim`, `LearnSim`) call `createWorld` / `addEntity` and run a system pipeline (`LearnSim`'s is a reduced chase-only sandbox; see [docs/learn.md](./learn.md)). `PlayScene` and `LearnScene` are adapters over them. `MenuScene`, `HighScoresScene`, `SettingsScene`, and `PauseScene` are Phaser presentation + input only (BitmapText, keyboard, pointer). Do not put bitecs in UI scenes.

Pausing (Escape) is available at any point during `PlayScene`, including mid-death-sequence, mid-level-transition, and while the level-clear upgrade-choice modal is open — `scene.pause()` halts `PlayScene.update()` entirely, so whichever of those states was active simply freezes and resumes exactly where it left off; `scene.pause()` never touches the Sound Manager, so the game-play music loop keeps playing unattended through the pause menu. `SettingsScene` accepts an optional `returnScene` value (Phaser scene init data) so it can return to either `MenuScene` (default) or `PauseScene` depending on how it was opened; `PlayScene` itself is never restarted by this round trip. `PauseScene`'s Quit option turns into an inline `SURE?  YES  NO` on the same row (default focus: NO); Up cancels the confirm and moves focus to Settings, same as a normal Up from the Quit row. Confirming Yes stops `PlayScene` (its existing `SHUTDOWN` handler covers game-play music/modal/banner cleanup) without ever calling `saveRun`.

**Debug tuning (`?knobs=1`):** `PlaySim` takes a per-run `Tuning` (constructor arg, `setTuning`) and passes it to every helper and system it tunes; helpers default the param to `DEFAULT_TUNING`, which equals the old constants, so runs without the flag and `LearnSim` are unchanged. Only with `?knobs=1` does `PlayScene` load stored overrides (`debugTuningStorage`), hide the side HUD, and mount `knobsPanel` (plain DOM, positioned from the canvas rect and maze offsets); panel edits call `sim.setTuning` + save, and wall knobs reach `render.ts` through `setWallStyle`. Per-board values (timer max, release dots, fruit thresholds) take effect on the next board. RESTART calls `scene.restart({ restartLevel, seed })`, which `PlayScene.create` reads to start a fresh run at that level with the same seed.

High Scores reads `loadRunHistory()` and builds a **display-only** sorted view via `highScoresView` (collected pellets desc, then remaining time desc). Storage remains chronological append order.

Settings reads/writes `audioSettings` via `audioSettingsStorage` (`pac-rogue.audio-settings.v1`). **Music** scales whichever music track is currently playing (`menuMusic` or `gameplayMusic` — see below); **SFX** scales every other clip. Adjusting the Music slider or toggling Music on/off (`syncMusicPlayback` in `game/audio/sfx.ts`) directly starts, stops, or re-volumes the live track instead of playing a separate preview clip; the SFX slider still plays a one-shot `pelletMunch` preview on change. `SettingsScene` resolves which track it controls via `musicIdForContext(returnScene)`: `gameplayMusic` when opened from `PauseScene`, `menuMusic` otherwise. Agent `noAudio` still wins for playback; Settings stays editable and shows `AUDIO DISABLED` when muted.

Three looping music tracks share the `"music"` audio category (the third, `storeMusic` / `sound/store.ogg`, replaces `gameplayMusic` on store floors — see [docs/store.md](./store.md#music)): `menuMusic` (`sound/menu.ogg`) plays continuously across `MenuScene`, `LearnScene`, `HighScoresScene`, and `SettingsScene` (when opened from the menu) — each of those scenes starts it (idempotently) in `create()`, so navigating between them never restarts or glitches it. `gameplayMusic` (`sound/game-play.ogg`, the id was previously named `siren`) plays only during `PlayScene`, including while `PauseScene` is open on top of it; `PlaySim.start()` stops `menuMusic` as its first action so the two tracks never overlap.

## Game loop

```text
PlayScene.update → (fanfare music hand-off; Escape → pause; tick starting card / upgrade modal UI) → PlaySim.step(input, delta) → apply events
PlaySim.step →
  (if starting card open: return; on close suppress input until key release)
  (if dying: tickDeathSequence → handle events (reset / fade / GO / resume / menu); return; no sim)
  (if run complete: tick hold → MenuScene; return)
  (if level transition: tick pause → store floor (after 3, 5-or-6, 8) else advance board (level < 9) or begin run complete (level 9); return)
  (if store floor: clicked-exit route step (else stop-on-release input) → movement → tunnel exit check (→ slide out + fade, then advance) → storeStep (Left/Right toggle, Enter confirm) → apply purchase → overlay sync → render; return)
  (if an upgrade offer is pending or its modal is still animating: return; then suppress input until key release)
  (if level-end time bonus draining: drain Time into the BONUS bar (Quarters paid as it fills) → then upgrade offer or level transition; return)
  (if pending level clear: start level transition; return)
  applyHeldKeys →
  tickGhostRelease + ghostHouseSeating + ghostRelease (boardCollected + afterLifeRelease gates Inky/Clyde) →
  tickGhostCornerWarps + tickFreeze + tickWallPass → (wall-pass expire → snapPlayerToNearestWalkable) → tickInvuln + tickSpeedBurst + tickEatDrag → applyPlayerSpeed → applyGhostSpeed (level mul × upgrade mul + closest-ghost freeze + corner-warp hold; skips inHouse) →
  bossGhostBlock? (boss level: head-on boss ghosts reverse) →
  movement (optional player solids override while wall-pass active) →
  ghostExitHouse (startGhostModeClock once if inactive) →
  tickRunClock →
  (player cell changed → bonus enterCell: blank tile breaks the streak) →
  collectPellets → releaseDrawable(removed) → bonus applyStreakPellets (or tickStreakIdle) → bar fill pays Quarters → eatDragAfterCollect → applyPowerPelletEffects → freezeClosestGhost? →
  collectExtraPellets? → releaseDrawable(bonus) → applyPelletCollect(touch+bonus) →
  resolveGhostModeStep →
  (effective mode changed ? forceGhostReverse : ghostAi) →
  recallClosestGhost? → teleportGhostsToCorners? → warpPlayerFarthest? →
  tickFruitPresence (boardCollected; spawn/replace/despawn) →
  collectFruit → releaseDrawable(removed) → munch SFX + half a BONUS bar of charge (a fill pays a Quarter; fruit has no upgrade effect) →
  tickBoss? (boss level: eaten boss pellets queue Blinkys; spawn at free tunnel mouths) →
  (if board clear: level-complete SFX → level-end time drain unless level 9 or Time is 0 (see the gate above) → levels 1 and 9: level transition; levels 2-8: pickUpgradeChoiceOffer → modal (pending level clear) always opens (up/left/right upgrades + down Quarters); return)
  catchPlayer (skip frozen eid or player invulnerable) →
  render (closest-ghost freeze tint; player wall-pass tint or invuln gold tint) →
  (if caught: stop game-play music, play death, spend life, begin death sequence)
```

Each `startBoard()` merges the spawned ghost kinds into the LEARN seen record (`pac-rogue.seen.v1`).

While the upgrade choice is pending (or its modal is still animating), `PlaySim.step` early-returns (full sim freeze), same family as the death sequence halt. It is opened only on a level 2-8 clear (never by fruit; `offersUpgradeAfterLevel`); level 1's and level 9's clears and any level-clear with no eligible upgrades skip straight to the level transition.
See also [docs/upgrades.md](./upgrades.md) and [docs/levels.md](./levels.md).

`PlayScene` keeps its HUD "chrome" (Quarter icons, `Time:`, upgrades list, life icons, BONUS bar) in one `Container`, so a huge pellet streak can shake the HUD without moving the maze or camera; see [docs/bonus.md](./bonus.md).

1. `preload()`: pac-man frames, pellet + power-pellet art, Blinky + Pinky + Inky + Clyde, bonus fruit art, SFX.
2. `create()`: optional `?maze=maze1|maze2|mazeSmall` (else level 1 → `mazeSmall`; level 2+ → procedural ASCII via `mazeGenerate`), `?level=` (else 1; clamped to `MAX_LEVEL` = 9; level 9 is the boss — see [docs/bosses.md](./bosses.md)), and `?quarters=` (else 0), then board spawn (world, walls, pellets, player, ghosts from `ghostKindsForLevel(levelIndex, secondGhostKind)` — level 1: Blinky + `secondGhostKind` (Pinky or Inky, picked 50/50 once per run at `create()`); level 2: Blinky + `secondGhostKind` + the other of Pinky/Inky (Blinky, Pinky, Inky); level 3+: all four), HUD (Quarters icon row, Time, lives icons, upgrade strip), `LEVEL N` fade banner, `lives = START_LIVES` (or `?lives=`; see [README Flags](../README.md#flags)), `RunUpgrades` from URL flags (`enableUpgrade` — see [README Flags](../README.md#flags)), game-play music.
3. Rectangular ASCII layouts (classic `maze1` / `maze2` are 28×31; level-1 `mazeSmall` is 22×21; generated boards are 28×34). Size band and fit gates: [docs/maze-constraints.md](./maze-constraints.md). Ghost house / door are carved in ASCII (`=` door, `H` floor; empty corridor `-` or space; optional `P` spawn). House spawn/exit and fruit cell are **derived** from ASCII; tunnels from edge walkability. `getActiveLayout().playerSolids` blocks the house; `ghostSolids` allows it. Helpers read the active layout set by `activateLayout` / `activateAsciiLayout` (syncs `MAZE_COLS` / `TILE_SIZE` / offsets).
4. House seats / release: in-house ghosts sit in four derived L→R seats on the spawn row (`ghostHouseSeatCenters`), ordered by **predicted** release (`ghostHouseOrder`). `ghostHouseSeating` animates reseating when that order changes (sticky: no cosmetic compact after someone leaves). Shared release clock (`GhostReleaseClock`, created with the level and rebuilt on every board start and death) starts on first player direction input; nothing leaves before it. First life of a board: Blinky leaves at `BLINKY_RELEASE_DELAY_MS` (100), Pinky at `PINKY_RELEASE_DELAY_MS` (0, i.e. on start), Inky at layout-scaled `boardCollected >=` pellets on level 1 (maze1 baseline `BASE_INKY_RELEASE_PELLETS` = 30) and immediately from level 2, Clyde at layout-scaled pellets on level 1 (baseline `BASE_CLYDE_RELEASE_PELLETS` = 60), `LEVEL2_CLYDE_RELEASE_DOTS` (50) on level 2 and immediately from level 3. After a life loss (`afterLifeRelease`) a shared counter of dots eaten since the death (`boardCollected - baselineCollected`) releases Pinky/Inky/Clyde at 7/17/32; Blinky keeps his timer. Idle release: once the clock has started, `idleMs` counts up and resets whenever a dot is eaten or a ghost leaves; at `idleReleaseLimitMs(level)` (4000 on levels 1-4, 3000 from level 5) `ghostRelease` sends out the highest-priority waiting non-boss ghost (Blinky, Pinky, Inky, Clyde) and `PlaySim` calls `resetIdle`. The House Delay upgrade adds `delayAddMs` to the Blinky/Pinky timers and the idle limit and `clydePelletAdd` to Clyde's dot count on both paths. Boss ghosts use their own `releaseDelayMs` and are never idle-released. Leaving ghosts first steer to the door column, then up to the exit. First ghost to leave house/door tiles → `active` and **start mode waves once** from `ghostModeWavesForLevel(levelIndex)` (level 1: chase-only forever; level 2+: arcade chase-first table, skipping the opening scatter). Later exits do not restart the clock.
5. Targeting: Blinky chase / Elroy → player tile; Blinky scatter → `(cols-3, -3)`. Pinky chase → 4 tiles ahead of player facing (`Facing.none` → left); Pinky scatter → `(2, -3)`. Inky chase → doubled vector from Blinky’s tile through a clean 2-tile Pac look-ahead (`Facing.none` → left; missing Blinky → house spawn tile); Inky scatter → `(cols-1, rows+2)`. Clyde chase → player tile when Euclidean tile distance `≥ CLYDE_SHY_TILES` (8), else Clyde scatter `(0, rows+2)`; Clyde scatter mode → same SW corner. Scatter corners scale with layout size (classic 28×31 matches the old absolute tiles). Delays and shy radius are tunable named constants. Steering: min squared distance at cell centers (tie: up > left > down > right); no voluntary reverse at Ls.
6. Speeds (vs `PLAYER_SPEED`, roughly matched to arcade Ms. Pac-Man's crossing): Maze-Man and ghosts both × `speedLevelMultiplier(levelIndex)` (`1 + 0.05×(level−1)`) each frame. Ghosts: base × `ghostBaseSpeedRatio(levelIndex)` (`0.8` at level 1, +0.05/level, pinned at `1.0` from level 5 on — ghosts start 20% slower than Maze-Man and catch up to parity by level 5); tunnel a constant 0.5× `PLAYER_SPEED` on every level (not ramped, matching the arcade); Elroy1/2 only for Blinky and unaffected by the ramp (layout-scaled remaining-pellet cutoffs; maze1 ≤20 / ≤10 → 1.0× / 1.0625× `PLAYER_SPEED` flat); then × level mul × run upgrade muls (Afterburner via `cellSpeedMultiplier`: ×1.3 when the look-ahead cell is empty, ×0.9 when it holds a pellet or fruit / `passiveGhostSlow`). Maze-Man additionally takes a brief eat drag (`eatDrag.ts`): eating a dot restarts a 100ms timer that cuts speed by up to 25%, easing linearly back to full (≈10% average loss on a dot run, like the arcade's one-frame stall without the hitch); a power pellet holds the peak for 300ms. It never stacks, is cleared on life loss / store / new board, and only runs in the main pipeline. `play.timers.eatDragMs` in the snapshot exposes the time left. Closest-ghost freeze sets that leaving/active ghost’s speed to 0.
7. Catch: circle overlap while any ghost is `leaving` or `active` → stop game-play music, play death SFX, spend one life. Full pipeline halt for `DEATH_HOLD_MS` (845, knob). If lives remain: reset player/ghosts to start/house, despawn fruit, clear freeze/wall-pass/invuln/speed-burst timers and ghost corner warps, reset release/mode clocks, set `afterLifeRelease`, `READY_PAUSE_MS` (1000) freeze, then resume (game-play music on); run/release clocks wait for direction again (`RunClock.started = false`); no high-score write. If last life: append high-score run (**lifetime** pellets + remaining countdown) unless a debug flag is present for this run (`highScoresDisabled`: every URL flag except `play`, `sound`, `learnAll`), then 500ms black fade (visual only) → `GAME OVER` + lifetime collected for `GAME_OVER_HOLD_MS` (2000) → `MenuScene`. Skipped for the frozen closest ghost or while player invuln is active; thaw/expiry while overlapping still kills.
8. Pellet clear: level-complete SFX (no history write). Level 1: brief transition freeze straight into the next board. Levels 2-8: the pick-one upgrade-choice modal always opens first — up to three eligible upgrades at the up/left/right slots plus an always-available Quarters option at the down slot (see [docs/upgrades.md](./upgrades.md)) — and the transition freeze starts only after it resolves. Level 9 (boss): no upgrade offer; the transition freeze is followed by a `RUN COMPLETE` screen that waits for the player to pick `NEW GAME` or `MENU` (see [docs/levels.md](./levels.md)) instead of a next board. Advancing rebuilds a **procedural** maze in the same `PlayScene` (carry lives, owned upgrades, lifetime Collected, Quarters; reset board pellet progress, clocks, fruit, freeze/scatter/wall-pass/invuln/speed-burst timers; Time back to 999; `LEVEL N` banner fades). Power pellets play both munches and stay inert unless an owned upgrade reacts. `render` draws rounded wall stroke from maze knobs, pac-man chomp, pellets, ghosts (cyan tint on the frozen closest ghost), bonus fruit, and tunnel twin (player wall-pass tint while active; else darker-gold invuln tint that blinks in the last second).
9. Bonus fruit: level 1 spawns a single fruit after 70 **board** pellets are collected (unscaled — mazeSmall's pellet count is well above 70, so no second fruit fires); from level 2+, after layout-scaled **board** pellet thresholds (maze1 70 and 170), spawn at the derived under-house fruit cell for 10 real seconds (Phaser `delta` ms); cherries use `strawberry.png` stand-in; pickup removes the entity, plays both munches, and adds half a [BONUS bar](./bonus.md) of charge (each fill pays a Quarter; spent at [store floors](./store.md)) — no upgrade effect (the upgrade choice comes from clearing the level, not from fruit; see item 8 and [docs/upgrades.md](./upgrades.md)).

## ECS boundary

| Layer                                                      | May import Phaser? | May mutate component arrays?                         | Role                                    |
| ---------------------------------------------------------- | ------------------ | ---------------------------------------------------- | --------------------------------------- |
| `game/components/**`                                       | No                 | Define storage only                                  | Data                                    |
| logic systems (`movement`, `ghostAi`, `collectPellets`, …) | No                 | Yes                                                  | Pure simulation                         |
| `game/systems/playerDirection.ts`                          | No                 | No (reads `Input` only)                              | Pure query helper                       |
| `game/systems/playerInput.ts`, `render.ts`                 | Yes                | Read keys / drawable sync                            | Bridges                                 |
| `game/sim/**` (`PlaySim`, `LearnSim`)                      | No                 | Yes; only layer that creates worlds/entities         | Run state + pipeline; emits `SimEvent`s |
| `game/scenes/**`                                           | Yes                | No (ESLint bans `bitecs`, components, logic systems) | Adapters: input in, events applied out  |
| `domain/**`                                                | No                 | No bitecs world APIs                                 | Pure helpers                            |

`npm run verify` enforces this via ESLint `no-restricted-imports` and `npm run check:ecs`. Docs are not the gate.

## Anti-abstraction rules

A violation of these is a failed architecture check:

- Phaser GameObjects are **not** the source of truth for position; they only mirror ECS `Position`.
- Sticky `Input` is written by `playerInput` / ghost AI / release / mode-reverse. `movement` updates `Facing`, `Velocity`, and `Position` in normal play; `forceGhostReverse` also sets both `Facing` and `Input` on scatter↔chase boundaries (and that frame skips `ghostAi` so the reverse is not overwritten).
- Scenes are adapters: they read Phaser input into a `SimInput`, call the sim, and apply its `SimEvent`s (sounds, drawing, HUD, modals, banners, storage writes). **No simulation state, systems or world APIs in scenes** (`check:ecs` bans `createWorld`/`addEntity`; ESLint bans `bitecs`, `components/*` and logic-system imports in scenes, and scenes/audio/storage/bridge imports in `sim/`). Scenes read derived state through sim getters, `snapshot()` or `LearnSim.overlayModel()`; only `render.ts` / `playerInput.ts` take the `World`.
- Gameplay decisions live in `src/game/sim/**`, systems or `src/domain/**`, and are tested headlessly through the sim harness; see [src/game/sim/README.md](../src/game/sim/README.md) and [VERIFICATION.md](./VERIFICATION.md#scene-and-render-logic).
- Wall layout/collision comes from the domain maze grid; Wall entities carry `Position` for ECS presence; wall Graphics stroke rounded outlines from domain path commands.
- One local GameObject map inside the render bridge is enough — do not build a sync framework.
- Do not invent Entity/Component/System manager classes around bitecs.
- All randomness comes from the run's `RunRandom` (`src/domain/runRandom.ts`), one named stream per consumer, so `?seed=` replays a run. ESLint bans `Math.random`, `crypto` randomness, Phaser's RNG and camera `shake` in `src/`; see [VERIFICATION.md](./VERIFICATION.md#seeded-runs).
- bitecs **0.4** only. No `bitecs/legacy`, no second ECS library.

## Principles

1. **Domain vs presentation** — Pure math, maze, and playfield helpers live in `src/domain`. Gameplay rules live in Phaser-free systems. Scenes gather input and present; they do not own simulation.
2. **Composition** — Prefer small functions and SoA components wired together. Do not introduce a god `GameManager` or global mutable singleton.
3. **Dependencies** — Add a package only with a concrete need. Prefer stdlib and existing tooling.
4. **Verification** — Automated checks (including `check:ecs`) and production build are mandatory. Gameplay/visual changes also require runtime inspection (see `docs/VERIFICATION.md`).

## Current runtime

- Boot lands on `MenuScene` (`DOT-MAN` title, Start / Learn / High Scores / Settings), or on `PlayScene` when `?play=1`. Start opens `PlayScene`; Learn opens `LearnScene` (see [docs/learn.md](./learn.md)); High Scores opens `HighScoresScene` (pellets + remaining time + date from localStorage; empty → `NO SCORES YET`; list viewport fills down to a clearance above Back; more rows than fit → pause-at-top then scroll with trail loop); Settings opens `SettingsScene` (music/SFX checkboxes + 0..10 notched volumes in localStorage). `MenuScene`, `LearnScene`, `HighScoresScene`, and `SettingsScene` (when opened from the menu) all loop `menuMusic` (`sound/menu.ogg`), started idempotently in each scene's `create()` so it plays continuously across all of them until a game actually starts.
- Only `PlaySim` and `LearnSim` own world creation and a system pipeline; `PlayScene`/`LearnScene` adapt them to Phaser. UI scenes have no ECS.
- Escape during `PlayScene` opens `PauseScene` (dims the paused board; while Maze-Man walks to a clicked store tunnel it cancels the walk instead, see [docs/store.md](./store.md#leaving)) — Resume returns control immediately; Settings reuses `SettingsScene` and returns to the pause menu; Quit turns its row into an inline `SURE?  YES  NO` (default NO, Up cancels back to Settings) and, if confirmed, ends the run and returns to `MenuScene` without writing a high-score entry. The pause menu also lists the run's owned upgrades down the left edge (the HUD list is hidden while paused); hovering one shows its card (label, school, description) on the right. Pausing works mid-death-sequence, mid-level-transition, and mid-upgrade-modal alike, and `gameplayMusic` keeps playing throughout the pause menu (and any `SettingsScene` opened from it) since `scene.pause()` never touches audio.
- Rectangular maze (per-layout cols/rows; **fixed** tile size `TILE_SIZE_PX` (16px, same for every layout — Pac-Man/ghosts render at one consistent pixel size across all levels) centered under `MAZE_TOP_MARGIN_PX` in the leftover 800×600 band; reject if pixel width/height overflow the playfield or left gutter `< 80` — see [maze-constraints.md](./maze-constraints.md)) with stroked walls (rounded corners). Visual knobs live on `maze.ts`: `MAZE_TOP_MARGIN_PX`, `MAZE_BACKGROUND_COLOR`, `WALL_STROKE_COLOR`, `WALL_STROKE_WEIGHT`, `WALL_CORNER_RADIUS`, `WALL_CORNER_CURVE_MIN_STEPS`, `WALL_CORNER_CURVE_KIND`, `WALL_INSET_PX` (pull stroke into wall tiles), `PLAYER_WALL_PADDING_PX` (actor display size only), `pelletDisplaySize()` / `powerPelletDisplaySize()` (clamped to tile). Dual solids (player blocked from house/door; ghosts allowed), horizontal tunnels.
- One player entity (display size from wall padding; open mouth when idle) spawns in the lowest empty center maze cell, then moves continuously along centerlines with sticky next-direction turns; the player may turn up to `playerPreTurnPx()` (4px) before or after a junction center and **cuts the corner** — no snap: the leftover offset eases off at travel speed while it advances at full speed along the new heading, so a turn gains ground either way (ghosts keep the 2px `TURN_ALIGN_EPS` snap); walls/exterior/house block travel; tunnels wrap with dual-draw while straddling. Holding two perpendicular direction keys moves the player diagonally instead when all three destination cells are open (normalized speed, wall-slide on a genuinely blocked flank, no cutting through a wall corner) — gated behind `powerPelletWallPass` on maze boards (its solids grid phases through interior walls), always available in the store — see [docs/upgrades.md](./upgrades.md#wall-pass) and [docs/store.md](./store.md#movement).
- Regular pellets (`dot.png`) and power pellets (`power-pellet.png` on `@` cells) on playable cells; touching removes them, plays pickup SFX (both munches for power pellets; volumes from SFX settings), and increments an internal **lifetime** pellet count (board-local count drives Inky/Clyde/fruit/clear; lifetime count still feeds the Game Over screen and high scores, though it is no longer shown live — the top-left HUD is Quarters dots instead). Looping `gameplayMusic` (`sound/game-play.ogg`) plays during `PlayScene`, including while paused, until clear, catch, or shutdown (volume from music settings), then `MenuScene`'s `menuMusic` resumes; clearing all pellets plays level-complete SFX, then (levels 1 and 9) advances straight to the next board or Run Complete, or (levels 2-8) offers the level-clear upgrade choice first — see [docs/levels.md](./levels.md); catch plays death SFX then life-loss reset (or Game Over on the last life).
- Bonus fruit appears under the ghost house at board pellet thresholds: level 1 spawns one fruit after 70 pellets (unscaled, single threshold); from level 2+ it appears under the ghost house at board thresholds (maze1 70/170), lasts 10 real seconds, uses cherries (`strawberry.png` stand-in); pickup plays both munches, removes the fruit, and adds half a [BONUS bar](./bonus.md) of charge (each fill pays a Quarter; spent at [store floors](./store.md)) — no upgrade effect (see [docs/upgrades.md](./upgrades.md) for the level-clear upgrade modal).
- Level 9 is a boss fight (Double Blinky): `BOSS` banner with camera shake, 3-tunnel board, 8 glowing boss pellets that each add a Blinky from a side tunnel (2 → 10), Blinkys treat each other as walls — see [docs/bosses.md](./bosses.md).
- Start with 3 lives, but `livesAfterLevelRegen` (`src/domain/lives.ts`) tops up by one life at level 1 and at every level clear (before the upgrade offer) whenever fewer than 3 HUD icons are showing (4 with `passiveExtraLife`) — so every run effectively begins at 4 lives (3 icons), and a run that dropped below that floor trickles back up by one life per level clear (not an instant refill). `passiveExtraLife` raises the floor to 4 icons and its own +1 life is uncapped. `passiveMyogenesis` regenerates up to 2 lives per top-up (`levelRegenAmount`) but never past the floor. Bottom-left pac icons show remaining extras only (3 at run start, not the life in play); lives carry across level advances. Ghosts unlock by level (`ghostKindsForLevel`: level 1 Blinky only; level 2 Blinky + a randomly chosen Pinky or Inky picked once per run; level 3+ all four); only unlocked kinds are spawned. Present ghosts use predicted L→R house seats (not stacked); arcade-style house release after first input (see house/release above: Blinky 0.1s, Pinky immediate, Inky/Clyde by level-dependent dot counts, post-death 7/17/32 shared counter, idle push-out at 4s/3s); leave path approaches door column then up; chase-first arcade scatter/chase waves (L1 chase-only; L2+ arcade chase-first); Blinky Cruise Elroy; Inky Blinky-vector chase + SE scatter; tunnel slowdown; Maze-Man and ghosts gain +5% speed per level index via `speedLevelMultiplier`; ghosts additionally start at 80% of Maze-Man's base speed on level 1, ramping to full parity by level 5 via `ghostBaseSpeedRatio` (fixed 9-level plan — see [docs/levels.md](./levels.md); level-9 boss Blinkys use a flat speed, see [docs/bosses.md](./bosses.md)). Circle overlap spends a life (hold → reset actors / ready pause → resume) or last-life Game Over (hold → append high-score run → fade → `GAME OVER` + lifetime collected → menu) unless closest-ghost freeze walk-through or player invuln is active.
- Top-right `Time` countdown (999, −1/100ms after first input, clamp at 0; resets each level). Last-life Game Over appends **lifetime** pellets + remaining time + ISO date to capped `localStorage` run history (`pac-rogue.run-history.v2`, max 100, drop oldest), unless a debug flag was present for the run (`highScoresDisabled` in `src/domain/runHistory.ts`: every URL flag except `play`, `sound`, `learnAll`). Clearing all pellets never writes history — including clearing level 9, which shows a `RUN COMPLETE` screen and returns to `MenuScene` instead of a next board.
- Domain helpers (`clamp`, `circles`, `countdown`, `runClock`, `runLevel`, `levelRules`, `pelletProgress`, `fruit`, `upgrades`, `runHistory`, `highScoresView`, `scoreListScroll`, `audioSettings`, `playfield`, `maze`, `lives`, `deathSequence`, ghost kind/path/movement/target/mode/release/house-order/seats/leave/speed) are Phaser-free; movement/collect/clock/progress/scroll/view/audioSettings/ghost/lives/deathSequence helpers are unit-tested without Phaser.
- Power pellets are inert unless an owned upgrade reacts (`powerPelletFreeze`, `powerPelletScatterBurst`, `powerPelletSpeedBurst`, `powerPelletGhostRecall`, `powerPelletWarpFarthest`, `powerPelletExtraHungry` — see [docs/upgrades.md](./upgrades.md)). No arcade fright / eatable ghosts yet.
