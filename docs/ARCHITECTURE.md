# Architecture

Current shape of pac-rogue. Keep this document short and truthful — update it when the structure changes.

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
    fruit.ts                  # bonus fruit kinds, 70/170 presence clock
    upgrades.ts               # run upgrade defs + RunUpgrades helpers
    runHistory.ts
    highScoresView.ts
    scoreListScroll.ts
    playfield.ts              # speeds, sizes, drawable ids
    maze.ts                   # ASCII maze, solids, visual knobs, wall path cmds
    ghostPath.ts              # intersection direction pick + reverse helper
    ghostMovement.ts          # phase solids, one-way enter, L reverse redirect
    ghostKind.ts              # blinky / pinky / clyde kind ids
    ghostTarget.ts            # Blinky/Pinky/Clyde chase/scatter/Elroy target tiles
    ghostPhase.ts             # inHouse / leaving / active phase ids
    ghostMode.ts              # level-1 scatter/chase wave clock + scatter-burst pause
    ghostRelease.ts           # per-kind time delays + Clyde pellet leave
    ghostSpeed.ts             # base / Elroy (Blinky) / tunnel speed resolve
    ghostRecall.ts            # closest eligible ghost pick for house recall
    deathSequence.ts          # catch → fade timing (freeze hold + fade start)
  game/
    config.ts                 # Phaser GameConfig (FIT scale + pixelArt)
    audio/sfx.ts
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
      runHistoryStorage.ts    # localStorage adapter for successful runs
    systems/
      playerInput.ts          # Phaser keys → sticky Input
      ghostRelease.ts         # inHouse → leaving (time or Clyde pellets)
      ghostAi.ts              # kind target tile → sticky Input (once per tile)
      ghostSpeed.ts           # Speed from Elroy (Blinky) + tunnel + upgrade mul/freeze
      ghostReverse.ts         # mode-change reverse via Input
      ghostExitHouse.ts       # leaving → active once off house/door tiles
      ghostRecall.ts          # power-pellet house teleport for closest ghost
      movement.ts             # Facing + collision (per-eid Speed + solids)
      catchPlayer.ts          # circle overlap → caught (skip when frozen)
      collectPellets.ts
      collectFruit.ts
      playerSpeed.ts          # Player Speed from base × upgrade mul
      playerDirection.ts
      playerWarp.ts           # power-pellet warp to dynamic top-center
      render.ts               # sprites + rounded wall stroke; preloadPlayArt
    scenes/
      pixelFont.ts            # RetroFont BitmapText helpers + VGA 8x8 atlas
      font8x8Basic.ts         # public-domain IBM VGA glyph bitmaps (U+0020..7E)
      MenuScene.ts            # boot title + Start / High Scores (no ECS)
      HighScoresScene.ts      # localStorage scores list + scroll (no ECS)
      PlayScene.ts            # preload art, createWorld, spawn, HUD, pipeline
public/
  art/                        # Pac-Man / pellet / power-pellet / ghost / fruit PNGs
  sound/                      # SFX (pickups, looping siren, level complete, death)
scripts/
docs/
```

## Ports

- Humans: `npm run dev` → 5173, `npm run preview` → 4173
- Agents: `npm run dev:agent` → 5174, preview/visual → 4174
- Agents may kill/restart only their ports.

## Scenes

Boot order in `gameConfig.scene`: `MenuScene` (first = entry), `HighScoresScene`, `PlayScene`.

```text
MenuScene --Start--> PlayScene
MenuScene --High Scores--> HighScoresScene
HighScoresScene --Back--> MenuScene
PlayScene --caught--> death freeze/SFX/fade --> MenuScene
```

**ECS ownership:** only `PlayScene` calls `createWorld` / `addEntity` and runs the system pipeline. `MenuScene` and `HighScoresScene` are Phaser presentation + input only (BitmapText, keyboard, pointer). Do not put bitecs in UI scenes.

High Scores reads `loadRunHistory()` and builds a **display-only** sorted view via `highScoresView` (score desc). Storage remains chronological append order.

## Game loop

```text
PlayScene.update →
  (if dying: tickDeathSequence → optional overlay fade tween → return; no sim/render)
  playerInput →
  tickGhostRelease + ghostRelease →
  tickFreeze + tickScatterBurst → applyPlayerSpeed → applyGhostSpeed (mul + freeze) →
  movement →
  ghostExitHouse (startGhostModeClock once if inactive) →
  tickRunClock →
  collectPellets → applyPowerPelletEffects → applyPelletCollect →
  resolveGhostModeStep (pause wave while scatter burst + clock active) →
  (effective mode changed ? forceGhostReverse : ghostAi) →
  recallClosestGhost? → warpPlayerTopCenter? →
  tickFruitPresence (spawn/replace/despawn) → collectFruit → grantRandomUpgrade →
  catchPlayer (skip if frozen) →
  render (ghost freeze tint) →
  (if caught: stop siren, play death, begin death sequence)
```

See also [docs/upgrades.md](./upgrades.md).

1. `preload()`: pac-man frames, pellet + power-pellet art, Blinky + Pinky + Clyde, bonus fruit art, SFX.
2. `create()`: world, walls, pellets (`.` / `@` with `PowerPellet` on `@`), player (`Speed = PLAYER_SPEED`), Blinky + Pinky + Clyde in house (`Speed = 0`, `GhostPhase = inHouse`, `GhostKind`), HUD (including hidden upgrade strip), `RunUpgrades` from optional URL flags (`forceUpgrade` / `enableUpgrade` — see [README Flags](../README.md#flags)), siren.
3. Ghost house / door are carved in ASCII (`=` door, `H` floor). `MAZE_PLAYER_SOLIDS` blocks the house; `MAZE_GHOST_SOLIDS` allows it.
4. Release: shared clock starts on first player direction input for Blinky (`BLINKY_RELEASE_DELAY_MS` = 100) and Pinky (`PINKY_RELEASE_DELAY_MS` = 5000). Clyde leaves when `collectedCount >= CLYDE_RELEASE_PELLETS` (60), independent of the time clock. Ghosts climb out through the door. First ghost to leave house/door tiles → `active` and **start mode waves once** in **chase** (arcade level-1 table, skipping the opening scatter; later scatter/chase durations stay arcade). Later exits do not restart the clock.
5. Targeting: Blinky chase / Elroy → player tile; Blinky scatter → `(25, -3)`. Pinky chase → 4 tiles ahead of player facing (`Facing.none` → left); Pinky scatter → `(2, -3)`. Clyde chase → player tile when Euclidean tile distance `≥ CLYDE_SHY_TILES` (8), else Clyde scatter `(0, 33)`; Clyde scatter mode → same SW corner. Delays, pellet leave, shy radius, and scatter coords are tunable named constants. Steering: min squared distance at cell centers (tie: up > left > down > right); no voluntary reverse at Ls.
6. Speeds (vs `PLAYER_SPEED`): base 0.9375×; Elroy1/2 only for Blinky (≤20 / ≤10 pellets → 1.0× / 1.0625×); tunnel 0.5× for all ghosts; then run upgrade muls (`playerSpeedUp` / `ghostSlow`) each frame. Freeze sets leaving/active ghost speed to 0.
7. Catch: circle overlap while any ghost is `leaving` or `active` → stop siren, play death SFX, enter PlayScene death phase (full pipeline halt; no high-score write). After 500ms start a 500ms full-screen black overlay fade; on fade complete hard-cut `scene.start("MenuScene")`. Skipped while freeze is active; thaw while overlapping still kills.
8. Pellet clear still records score + level-complete SFX; power pellets play both munches. Power pellets are inert unless an owned upgrade reacts (freeze, scatter burst, ghost recall, warp top — see [docs/upgrades.md](./upgrades.md)). `render` draws rounded wall stroke from maze knobs, pac-man chomp, `dot.png` / `power-pellet.png`, Blinky, Pinky, Clyde (cyan tint while frozen), bonus fruit, and tunnel twin.
9. Bonus fruit: after 70 and 170 pellets collected, spawn at cell `(13, 17)` for 10 real seconds (Phaser `delta` ms); level-1 cherries use `strawberry.png` stand-in; pickup removes the entity, plays both munches (no score yet), and grants one random distinct run upgrade (see [docs/upgrades.md](./upgrades.md)).

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

- Boot lands on `MenuScene` (`PAC-ROGUE` title, Start / High Scores). Start opens `PlayScene`; High Scores opens `HighScoresScene` (score+date list from localStorage; empty → `NO SCORES YET`; >5 rows pause-at-top then scroll with trail loop).
- Only `PlayScene` owns world creation and the system pipeline. UI scenes have no ECS.
- Static 28×31 maze (tile size from fit under `MAZE_TOP_MARGIN_PX`, then centered in the leftover 800×600 band) with stroked walls (rounded corners). Visual knobs live on `maze.ts`: `MAZE_TOP_MARGIN_PX`, `MAZE_BACKGROUND_COLOR`, `WALL_STROKE_COLOR`, `WALL_STROKE_WEIGHT`, `WALL_CORNER_RADIUS`, `WALL_CORNER_CURVE_MIN_STEPS`, `WALL_CORNER_CURVE_KIND`, `WALL_INSET_PX` (pull stroke into wall tiles), `PLAYER_WALL_PADDING_PX` (actor display size only), `PELLET_DISPLAY_SIZE`, `POWER_PELLET_DISPLAY_SIZE`. Dual solids (player blocked from house/door; ghosts allowed), mid-maze horizontal tunnel.
- One player entity (display size from wall padding; closed mouth when idle) spawns in the lowest empty center maze cell, then moves continuously along centerlines with sticky next-direction turns; walls/exterior/house block travel; tunnels wrap with dual-draw while straddling.
- Regular pellets (`dot.png`) and power pellets (`power-pellet.png` on `@` cells) on playable cells; touching removes them, plays pickup SFX (both munches for power pellets), and increments a top-left `Collected` counter. Looping siren plays during `PlayScene` until clear, catch, or shutdown; clearing all pellets plays level-complete SFX; catch plays death SFX then freezes → fades → menu.
- Bonus fruit appears under the ghost house at 70 and 170 pellets collected, lasts 10 real seconds, uses level-1 cherries (`strawberry.png` stand-in); pickup plays both munches, removes the fruit (no points yet), and grants one random distinct run upgrade (left mid-height labels; see [docs/upgrades.md](./upgrades.md)).
- Blinky, Pinky, and Clyde: shared house spawn; Blinky/Pinky time release after first input (0.1s / 5s — tunable); Clyde leaves at 60 pellets collected (tunable); chase-first arcade scatter/chase waves started once on first exit; Blinky Cruise Elroy; Pinky 4-tile look-ahead + NW scatter; Clyde shy chase (Euclidean `< 8` → SW scatter) + SW scatter (tunable); tunnel slowdown; circle overlap catch freezes play, plays death SFX, fades to black (500ms fade starting at 500ms), then hard-cuts to the menu (no high-score write) unless freeze walk-through is active.
- Top-right `Time` countdown (999, −1/100ms after first input, clamp at 0). Clearing all pellets appends remaining time as score to capped `localStorage` run history (`pac-rogue.run-history.v1`, max 100, drop oldest).
- Domain helpers (`clamp`, `circles`, `countdown`, `runClock`, `pelletProgress`, `fruit`, `upgrades`, `runHistory`, `highScoresView`, `scoreListScroll`, `playfield`, `maze`, `deathSequence`, ghost kind/path/movement/target/mode/release/speed) are Phaser-free; movement/collect/clock/progress/scroll/view/ghost/deathSequence helpers are unit-tested without Phaser.
- Power pellets are inert unless an owned upgrade reacts (`powerPelletFreeze`, `scatterBurst`, `ghostRecall`, `warpTop` — see [docs/upgrades.md](./upgrades.md)). No arcade fright / eatable ghosts / Inky yet.
