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
    runHistory.ts
    highScoresView.ts
    scoreListScroll.ts
    playfield.ts              # speeds, sizes, drawable ids
    maze.ts                   # ASCII maze, dual solids (player/ghost), house, tunnels
    ghostPath.ts              # intersection direction pick + reverse helper
    ghostMovement.ts          # phase solids, one-way enter, L reverse redirect
    ghostTarget.ts            # Blinky chase/scatter/Elroy target tile
    ghostPhase.ts             # inHouse / leaving / active phase ids
    ghostMode.ts              # level-1 scatter/chase wave clock
    ghostRelease.ts           # 0.1s release-after-input clock
    ghostSpeed.ts             # base / Elroy / tunnel speed resolve
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
      GhostPhase.ts
      Wall.ts
      Pellet.ts
      PowerPellet.ts
      Drawable.ts
    storage/
      runHistoryStorage.ts    # localStorage adapter for successful runs
    systems/
      playerInput.ts          # Phaser keys → sticky Input
      ghostRelease.ts         # inHouse → leaving after delay
      ghostAi.ts              # target tile → sticky Input (once per tile)
      ghostSpeed.ts           # Speed from Elroy + tunnel
      ghostReverse.ts         # mode-change reverse via Input
      ghostExitHouse.ts       # leaving → active once off house/door tiles
      movement.ts             # Facing + collision (per-eid Speed + solids)
      catchPlayer.ts          # circle overlap → caught
      collectPellets.ts
      playerDirection.ts
      render.ts               # sprites + pipes; preloadPlayArt
    scenes/
      pixelFont.ts            # RetroFont BitmapText helpers + VGA 8x8 atlas
      font8x8Basic.ts         # public-domain IBM VGA glyph bitmaps (U+0020..7E)
      MenuScene.ts            # boot title + Start / High Scores (no ECS)
      HighScoresScene.ts      # localStorage scores list + scroll (no ECS)
      PlayScene.ts            # preload art, createWorld, spawn, HUD, pipeline
public/
  art/                        # Pac-Man / pellet / power-pellet / ghost / fruit PNGs
  sound/                      # SFX (pickups, looping siren, level complete)
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
PlayScene --caught--> MenuScene
```

**ECS ownership:** only `PlayScene` calls `createWorld` / `addEntity` and runs the system pipeline. `MenuScene` and `HighScoresScene` are Phaser presentation + input only (BitmapText, keyboard, pointer). Do not put bitecs in UI scenes.

High Scores reads `loadRunHistory()` and builds a **display-only** sorted view via `highScoresView` (score desc). Storage remains chronological append order.

## Game loop

```text
PlayScene.update →
  playerInput →
  tickGhostRelease + ghostRelease →
  tickGhostMode →
  (forceReverse ? forceGhostReverse : ghostAi) → applyGhostSpeed →
  movement →
  ghostExitHouse (may startGhostModeClock) →
  tickRunClock →
  collectPellets → applyPelletCollect →
  catchPlayer →
  render →
  (if caught: MenuScene)
```

1. `preload()`: pac-man frames, pellet + power-pellet art, Blinky, SFX.
2. `create()`: world, walls, pellets (`.` / `@` with `PowerPellet` on `@`), player (`Speed = PLAYER_SPEED`), Blinky in house (`Speed = 0`, `GhostPhase = inHouse`), HUD, siren.
3. Ghost house / door are carved in ASCII (`=` door, `H` floor). `MAZE_PLAYER_SOLIDS` blocks the house; `MAZE_GHOST_SOLIDS` allows it.
4. Release: 100ms after first player direction input → `leaving`, climb out through the door; once off house/door tiles → `active` and start mode waves in **chase** (arcade level-1 table, skipping the opening scatter so he does not begin in scatter; later scatter/chase durations stay arcade).
5. Blinky targeting: chase / Elroy → player tile; scatter → fixed `(25, -3)`. Steering picks min squared distance at cell centers (tie: up > left > down > right); no voluntary reverse at Ls.
6. Speeds (vs `PLAYER_SPEED`): base 0.9375×, Elroy1 (≤20 pellets) 1.0×, Elroy2 (≤10) 1.0625×, tunnel 0.5×.
7. Catch: circle overlap while Blinky is `leaving` or `active` → stop siren, `scene.start("MenuScene")` (no high-score write).
8. Pellet clear still records score + level-complete SFX; power pellets play both munches. `render` draws pipes, pac-man chomp, `dot.png` / `power-pellet.png`, Blinky, and tunnel twin.

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
- Wall layout/collision comes from the domain maze grid; Wall entities carry `Position` for ECS presence; pipe Graphics mirror domain edges.
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
- Static 28×31 maze (tile size 19, centered in 800×600) with blue pipe-outline walls, dual solids (player blocked from house/door; ghosts allowed), and a mid-maze horizontal tunnel.
- One player entity (16×16 directional pac-man sprites; closed mouth when idle) spawns in the lowest empty center maze cell, then moves continuously along centerlines with sticky next-direction turns; walls/exterior/house block travel; tunnels wrap with dual-draw while straddling.
- Regular pellets (`dot.png`) and power pellets (`power-pellet.png` on `@` cells) on playable cells; touching removes them, plays pickup SFX (both munches for power pellets), and increments a top-left `Collected` counter. Looping siren plays during `PlayScene` until clear, catch, or shutdown; clearing all pellets plays level-complete SFX.
- One Blinky: house spawn, 0.1s release after first direction input, starts in chase then arcade scatter/chase waves + Cruise Elroy, tunnel slowdown; circle overlap catch returns to menu (no high-score write).
- Top-right `Time` countdown (999, −1/100ms after first input, clamp at 0). Clearing all pellets appends remaining time as score to capped `localStorage` run history (`pac-rogue.run-history.v1`, max 100, drop oldest).
- Domain helpers (`clamp`, `circles`, `countdown`, `runClock`, `pelletProgress`, `runHistory`, `highScoresView`, `scoreListScroll`, `playfield`, `maze`, ghost path/movement/target/mode/release/speed) are Phaser-free; movement/collect/clock/progress/scroll/view/ghost helpers are unit-tested without Phaser.
- No frightened mode, energizers behavior, or other ghosts yet (`@` cells are visual/audio power pellets with the same collect rules as dots).
