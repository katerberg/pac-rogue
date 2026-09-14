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
    runHistory.ts             # successful-run history schema + parse/append
    playfield.ts              # speed, size, bounds, drawable id / radius constants
    maze.ts                   # static maze ASCII, walls/exterior/tunnels, centers, pipe edges, wrap
  game/
    config.ts                 # Phaser GameConfig + shared dimensions
    components/               # data only — no Phaser
      Position.ts             # world x/y floats (pixels)
      Velocity.ts             # vx/vy floats (pixels per second)
      Input.ts                # sticky next direction intent
      Facing.ts               # current travel direction (movement-owned)
      Player.ts               # tag
      Wall.ts                 # tag — solid maze cell
      Pellet.ts               # tag — collectible regular pellet
      Drawable.ts             # presentation id / radius (player + pellets)
    storage/
      runHistoryStorage.ts    # localStorage adapter for successful runs
    systems/
      playerInput.ts          # Phaser keys → sticky Input (bridge)
      movement.ts             # Facing + maze collision / turns (Phaser-free)
      collectPellets.ts       # player–pellet overlap → removeEntity; countPellets (Phaser-free)
      render.ts               # sprites + wall pipe Graphics; preloadPlayArt (bridge)
    scenes/
      PlayScene.ts            # preload art, createWorld, spawn, HUD, pipeline
public/
  art/                        # Pac-Man / pellet / (unused) ghost & fruit PNGs
scripts/
  ports.json                  # Human vs agent local ports (single source of truth)
  visual-smoke.mjs            # Headless boot + screenshot for agents/CI
  check-ecs-boundaries.mjs    # Hard ECS layer gate (`npm run check:ecs`)
.github/workflows/
  verify.yml                  # CI: npm run verify on PRs and main
.githooks/
  pre-commit                  # Runs npm run verify:precommit (no build/visual)
docs/
  ARCHITECTURE.md             # This file
  VERIFICATION.md             # How to prove changes
```

## Ports

- Humans: `npm run dev` → 5173, `npm run preview` → 4173
- Agents: `npm run dev:agent` → 5174, preview/visual → 4174
- Agents may kill/restart only their ports.

## Game loop

```text
PlayScene.update → playerInput → (start timer on first Input) → movement → tick countdown → collectPellets → (persist clear) → render
```

1. `preload()`: load pac-man direction frames and pellet `dot.png` from `public/art/`.
2. `create()`: `createWorld()`, spawn Wall entities (one per wall cell) with `Position`, spawn Pellet entities (one per walkable cell) with `Position` + `Drawable` + `Pellet`, spawn one player with `Position` + `Velocity` + `Input` + `Facing` + `Player` + `Drawable`, create top-left `Collected` and top-right `Time` HUD texts, build the input/render bridges.
3. `update(_time, delta)`: `playerInput(world)` → start countdown on first non-`none` `Input` → `movement(world, delta)` → advance countdown (domain helper) → `collectPellets(world)` → on first full clear, append score to `localStorage` → `render(world)`.
4. `playerInput` writes sticky next intent into `Input.direction` (most recent held key; never cleared on release).
5. Countdown starts at 999 and decrements once per 100ms of real delta after the first direction input; clamps and stays at 0. Score for a successful clear is remaining time at the clear frame.
6. `movement` applies sticky `Input` into `Facing` (reverse immediately; 90° turns when travel reaches the cell center). Integrates position, snaps only the perpendicular axis to the corridor centerline, wraps through paired tunnel mouths (preserving facing/velocity), clamps smoothly against facing walls (no teleport-to-center), then playfield safety-clamps.
7. `collectPellets` removes pellets overlapping the player (circle radii from `Drawable`) and returns the frame count; the scene accumulates `Collected: N` on the HUD Text. When remaining pellets hit 0 after at least one collect, `runHistoryStorage` appends `{ score, clearedAt }` once for the run.
8. `render` draws maze pipe outlines once from domain wall edges, mirrors `Position` + `Drawable` (+ `Facing` for the player) onto 16×16 Image GameObjects (directional pac-man with distance-based chomp; `dot.png` pellets), dual-draws a twin player image while straddling a tunnel seam, and destroys images for removed entities.

Movement is continuous along corridor centerlines with buffered turns. Side tunnels wrap when both opposite edge cells are walkable; disconnected near-edge pockets are exterior (blocked, and wall pipes do not outline faces that touch exterior). Regular pellets on playable cells for now. No power pellets or enemies yet.

## ECS boundary

| Layer                                                                    | May import Phaser? | May mutate component arrays? | Role                |
| ------------------------------------------------------------------------ | ------------------ | ---------------------------- | ------------------- |
| `game/components/**`                                                     | No                 | Define storage only          | Data                |
| `game/systems/movement.ts`, `collectPellets.ts` (+ future logic systems) | No                 | Yes                          | Pure simulation     |
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

- One Phaser scene (`PlayScene`) owns world creation and the system pipeline.
- Static 28×31 maze (tile size 19, centered in 800×600) with blue pipe-outline walls and a mid-maze horizontal tunnel.
- One player entity (16×16 directional pac-man sprites; closed mouth when idle) moves continuously along centerlines with sticky next-direction turns; walls/exterior block travel; tunnels wrap with dual-draw while straddling.
- Regular pellets (`dot.png`) on playable cells; touching removes them and increments a top-left `Collected` counter.
- Top-right `Time` countdown (999, −1/100ms after first input, clamp at 0). Clearing all pellets appends remaining time as score to unbounded `localStorage` run history (`pac-rogue.run-history.v1`); no on-canvas history UI.
- `clamp` + `countdown` + `runHistory` + `playfield` + `maze` helpers are Phaser-free; `movement` and `collectPellets` are unit-tested without Phaser.
