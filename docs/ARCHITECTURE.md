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
    playfield.ts              # speed, size, bounds helpers
    maze.ts                   # static maze ASCII, solids, centers, pipe edges, collision
  game/
    config.ts                 # Phaser GameConfig + shared dimensions
    components/               # data only — no Phaser
      Position.ts             # world x/y floats (pixels)
      Velocity.ts             # vx/vy floats (pixels per second)
      Input.ts                # sticky next direction intent
      Facing.ts               # current travel direction (movement-owned)
      Player.ts               # tag
      Wall.ts                 # tag — solid maze cell
      Drawable.ts             # presentation id / color / radius (player)
    systems/
      playerInput.ts          # Phaser keys → sticky Input (bridge)
      movement.ts             # Facing + maze collision / turns (Phaser-free)
      render.ts               # player arcs + wall pipe Graphics (bridge)
    scenes/
      PlayScene.ts            # createWorld, spawn walls/player, run the pipeline
scripts/
  ports.json                  # Human vs agent local ports (single source of truth)
  visual-smoke.mjs            # Headless boot + screenshot for agents/CI
  check-ecs-boundaries.mjs    # Hard ECS layer gate (`npm run check:ecs`)
.github/workflows/
  verify.yml                  # CI: npm run verify on PRs and main
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
PlayScene.update → playerInput → movement → render → Phaser GameObjects
```

1. `create()`: `createWorld()`, spawn Wall entities (one per solid cell) with `Position`, spawn one player with `Position` + `Velocity` + `Input` + `Facing` + `Player` + `Drawable`, build the input/render bridges.
2. `update(_time, delta)`: `playerInput(world)` → `movement(world, delta)` → `render(world)`.
3. `playerInput` writes sticky next intent into `Input.direction` (most recent held key; never cleared on release).
4. `movement` tries to apply `Input` into `Facing` when centerline-aligned and the neighbor cell is open; otherwise keeps `Facing` if open, else stops. Integrates position, snaps perpendicular to the corridor centerline, clamps against solid cells, then playfield safety-clamps.
5. `render` draws maze pipe outlines once from domain edges, and mirrors player `Position` + `Drawable` onto Arc GameObjects.

Movement is continuous along corridor centerlines with buffered turns. No tunnels, pellets, or enemies yet.

## ECS boundary

| Layer                                               | May import Phaser? | May mutate component arrays? | Role                |
| --------------------------------------------------- | ------------------ | ---------------------------- | ------------------- |
| `game/components/**`                                | No                 | Define storage only          | Data                |
| `game/systems/movement.ts` (+ future logic systems) | No                 | Yes                          | Pure simulation     |
| `game/systems/playerInput.ts`, `render.ts`          | Yes                | Yes (input / drawable sync)  | Bridges             |
| `game/scenes/**`                                    | Yes                | Spawn / init only            | Wire + run pipeline |
| `domain/**`                                         | No                 | No bitecs world APIs         | Pure helpers        |

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
- Static 28×31 maze (tile size 19, centered in 800×600) with blue pipe-outline walls.
- One player entity (yellow circle) moves continuously along centerlines with sticky next-direction turns; walls block travel.
- `clamp` + `playfield` + `maze` helpers are Phaser-free; `movement` is unit- and integration-tested without Phaser.
