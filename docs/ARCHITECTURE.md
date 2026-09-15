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
    countdown.ts              # countdown start / tick interval / advance+clamp
    runClock.ts               # start-on-input countdown state machine
    pelletProgress.ts         # collect totals + once-per-run clear detection
    runHistory.ts             # successful-run history schema + capped append
    highScoresView.ts         # display sort/format for high-score list (Phaser-free)
    scoreListScroll.ts        # pause/scroll/loop state machine for long lists
    playfield.ts              # speed, size, bounds, drawable id / radius constants
    maze.ts                   # static maze ASCII, walls/exterior/tunnels, centers, pipe edges, wrap
  game/
    config.ts                 # Phaser GameConfig + shared dimensions
    ui/
      textStyles.ts           # shared monospace Phaser Text styles (HUD + menus)
    components/               # data only — no Phaser
      Position.ts
      Velocity.ts
      Input.ts
      Facing.ts
      Player.ts
      Wall.ts
      Pellet.ts
      Drawable.ts
    storage/
      runHistoryStorage.ts    # localStorage adapter for successful runs
    systems/
      playerInput.ts          # Phaser keys → sticky Input (bridge)
      movement.ts             # Facing + maze collision / turns (Phaser-free)
      collectPellets.ts       # player–pellet overlap → removeEntity (Phaser-free)
      playerDirection.ts      # read sticky Input for countdown start (Phaser-free)
      render.ts               # sprites + wall pipe Graphics; preloadPlayArt (bridge)
    scenes/
      MenuScene.ts            # boot title + Start / High Scores (no ECS)
      HighScoresScene.ts      # localStorage scores list + scroll (no ECS)
      PlayScene.ts            # preload art, createWorld, spawn, HUD, pipeline
public/
  art/                        # Pac-Man / pellet / (unused) ghost & fruit PNGs
  sound/                      # SFX (pickups, looping siren, level complete)
scripts/
  ports.json
  visual-smoke.mjs
  check-ecs-boundaries.mjs
docs/
  ARCHITECTURE.md
  VERIFICATION.md
```

## Ports

- Humans: `npm run dev` → 5173, `npm run preview` → 4173
- Agents: `npm run dev:agent` → 5174, preview/visual → 4174
- Agents may kill/restart only their ports.

## Scenes

Boot order in `gameConfig.scene`: `MenuScene` (first = entry), `HighScoresScene`, `PlayScene`.

Transitions use exclusive `scene.start` only (no parallel `launch` for v1):

```text
MenuScene --Start--> PlayScene
MenuScene --High Scores--> HighScoresScene
HighScoresScene --Back--> MenuScene
```

**ECS ownership:** only `PlayScene` calls `createWorld` / `addEntity` and runs the system pipeline. `MenuScene` and `HighScoresScene` are Phaser presentation + input only (Text, keyboard, pointer). Do not put bitecs in UI scenes.

High Scores reads `loadRunHistory()` and builds a **display-only** sorted view via `highScoresView` (score desc). Storage remains chronological append order.

## Game loop

```text
PlayScene.update → playerInput → movement → tickRunClock → collectPellets → applyPelletCollect → (persist clear) → render
```

1. `preload()`: load pac-man direction frames and pellet `dot.png` from `public/art/`, and game SFX (pickups, siren, level complete) from `public/sound/`.
2. `create()`: `createWorld()`, spawn Wall entities (one per wall cell) with `Position`, spawn Pellet entities (one per walkable cell) with `Position` + `Drawable` + `Pellet`, spawn one player with `Position` + `Velocity` + `Input` + `Facing` + `Player` + `Drawable`, create top-left `Collected` and top-right `Time` HUD texts, build the input/render bridges, start looping siren (stops on scene shutdown or level clear).
3. `update(_time, delta)`: `playerInput(world)` → `movement(world, delta)` → `tickRunClock` (domain; starts on first non-`none` Input via `hasPlayerDirectionInput`) → `collectPellets(world)` → play pellet SFX per removed count → `applyPelletCollect` (domain) → on first full clear, stop siren, play level-complete SFX, append score to `localStorage` → `render(world)`.
4. `playerInput` writes sticky next intent into `Input.direction` (most recent held key; never cleared on release).
5. `runClock` starts at 999 and decrements once per 100ms of real delta after the first direction input; clamps and stays at 0. Score for a successful clear is remaining time at the clear frame.
6. `movement` applies sticky `Input` into `Facing` (reverse immediately; 90° turns when travel reaches the cell center). Integrates position, snaps only the perpendicular axis to the corridor centerline, wraps through paired tunnel mouths (preserving facing/velocity), clamps smoothly against facing walls (no teleport-to-center), then playfield safety-clamps.
7. `collectPellets` removes pellets overlapping the player (circle radii from `Drawable`) and returns the frame count. The scene plays one SFX per removed pellet. `pelletProgress` tracks remaining/collected and signals a one-shot clear; the scene updates `Collected: N` and calls `runHistoryStorage` to append `{ score, clearedAt }` (oldest dropped when over cap).
8. `render` draws maze pipe outlines once from domain wall edges, mirrors `Position` + `Drawable` (+ `Facing` for the player) onto 16×16 Image GameObjects (directional pac-man with distance-based chomp; `dot.png` pellets), dual-draws a twin player image while straddling a tunnel seam, and destroys images for removed entities.

Movement is continuous along corridor centerlines with buffered turns. Side tunnels wrap when both opposite edge cells are walkable; disconnected near-edge pockets are exterior (blocked, and wall pipes do not outline faces that touch exterior). Regular pellets on playable cells for now. No power pellets or enemies yet.

## ECS boundary

| Layer                                                                    | May import Phaser? | May mutate component arrays? | Role                |
| ------------------------------------------------------------------------ | ------------------ | ---------------------------- | ------------------- |
| `game/components/**`                                                     | No                 | Define storage only          | Data                |
| `game/systems/movement.ts`, `collectPellets.ts` (+ future logic systems) | No                 | Yes                          | Pure simulation     |
| `game/systems/playerDirection.ts`                                        | No                 | No (reads `Input` only)      | Pure query helper   |
| `game/systems/playerInput.ts`, `render.ts`                               | Yes                | Yes (input / drawable sync)  | Bridges             |
| `game/scenes/**`                                                         | Yes                | Spawn / init only            | Wire + run pipeline |
| `domain/**`                                                              | No                 | No bitecs world APIs         | Pure helpers        |

`npm run verify` enforces this via ESLint `no-restricted-imports` and `npm run check:ecs`. Docs are not the gate.

## Anti-abstraction rules

A violation of these is a failed architecture check:

- Phaser GameObjects are **not** the source of truth for position; they only mirror ECS `Position`.
- `playerInput` writes sticky next intent into `Input`; only `movement` updates `Facing`, `Velocity`, and `Position`.
- Scenes wire the world, spawn entities, and run the pipeline — **no movement rules in the scene**.
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
- Static 28×31 maze (tile size 19, centered in 800×600) with blue pipe-outline walls and a mid-maze horizontal tunnel.
- One player entity (16×16 directional pac-man sprites; closed mouth when idle) spawns in the lowest empty center maze cell, then moves continuously along centerlines with sticky next-direction turns; walls/exterior block travel; tunnels wrap with dual-draw while straddling.
- Regular pellets (`dot.png`) on playable cells; touching removes them, plays pickup SFX, and increments a top-left `Collected` counter. Looping siren plays during `PlayScene` until clear or shutdown; clearing all pellets plays level-complete SFX.
- Top-right `Time` countdown (999, −1/100ms after first input, clamp at 0). Clearing all pellets appends remaining time as score to capped `localStorage` run history (`pac-rogue.run-history.v1`, max 100, drop oldest).
- `clamp` + `countdown` + `runClock` + `pelletProgress` + `runHistory` + `highScoresView` + `scoreListScroll` + `playfield` + `maze` helpers are Phaser-free; movement/collect/clock/progress/scroll/view helpers are unit-tested without Phaser.
- No in-play return to menu yet.
