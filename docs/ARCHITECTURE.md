# Architecture

Current shape of pac-rogue. Keep this document short and truthful — update it when the structure changes.

## Goals

- Fast local iteration (`npm run dev`).
- Hard verification before claiming work is done (`npm run verify`, including `check:ecs`).
- Small, composable modules over frameworks-of-frameworks.
- ECS (bitECS 0.4) is the gameplay model: components are data, systems are behavior, scenes only wire and tick.

## Layout

```text
src/
  main.ts                     # Phaser.Game bootstrap only
  styles.css                  # Page chrome around the canvas
  domain/                     # Pure helpers (no Phaser, no bitECS world APIs)
    clamp.ts
    playfield.ts              # speed, size, bounds helpers
  game/
    config.ts                 # Phaser GameConfig + shared dimensions
    components/               # data only — no Phaser
      Position.ts             # world x/y floats (pixels)
      Velocity.ts             # vx/vy floats (pixels per second)
      Input.ts                # direction: none|up|down|left|right
      Player.ts               # tag
      Drawable.ts             # presentation id / color / radius
    systems/
      playerInput.ts          # Phaser keys → Input (bridge)
      movement.ts             # Input → Velocity; integrate; clamp (Phaser-free)
      render.ts               # Position + Drawable → GameObjects (bridge)
    scenes/
      PlayScene.ts            # createWorld, spawn player, run the pipeline
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
PlayScene.update → playerInput → movement → render → Phaser GameObjects
```

1. `create()`: `createWorld()`, spawn one player with `Position` + `Velocity` + `Input` + `Player` + `Drawable`, build the input/render bridges.
2. `update(_time, delta)`: `playerInput(world)` → `movement(world, delta)` → `render(world)`.
3. `playerInput` writes keyboard intent (arrows and WASD) into `Input`. Most recently pressed direction wins.
4. `movement` immediately replaces `Velocity` from `Input` (direction × `PLAYER_SPEED`, or `0,0` when idle), then `Position += Velocity * (delta/1000)`, then clamps to the playfield.
5. `render` mirrors `Position` + `Drawable` onto a local `Map<eid, GameObject>`.

Movement is smooth and continuous. Direction changes are instant — no acceleration, deceleration, momentum, or grid stepping.

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
- `playerInput` writes intent into `Input`; only `movement` updates `Velocity` and `Position`.
- Scenes wire the world, spawn entities, and run the pipeline — **no movement rules in the scene**.
- One local `Map<eid, GameObject>` inside the render bridge is enough — do not build a sync framework.
- Do not invent Entity/Component/System manager classes around bitECS.
- bitECS **0.4** only. No `bitecs/legacy`, no second ECS library.

## Principles

1. **Domain vs presentation** — Pure math and playfield helpers live in `src/domain`. Gameplay rules live in Phaser-free systems. Scenes gather input and present; they do not own simulation.
2. **Composition** — Prefer small functions and SoA components wired together. Do not introduce a god `GameManager` or global mutable singleton.
3. **Dependencies** — Add a package only with a concrete need. Prefer stdlib and existing tooling.
4. **Verification** — Automated checks (including `check:ecs`) and production build are mandatory. Gameplay/visual changes also require runtime inspection (see `docs/VERIFICATION.md`).

## Current runtime

- One Phaser scene (`PlayScene`) owns world creation and the system pipeline.
- One player entity (yellow circle) moves smoothly on an open rectangular playfield.
- `clamp` + `playfield` helpers are Phaser-free; `movement` is unit-tested without Phaser.
