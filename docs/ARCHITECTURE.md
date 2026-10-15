# Architecture

Dot-Man: Phaser 4 for presentation, bitecs 0.4 for gameplay. This file holds structure and rules only; values, file inventories and step orders live in the code (`ls src/domain`, `PlaySim.step`).

## Layout

- `src/domain/` — pure helpers: maze, rules, parsing, tuning, storage shapes. No Phaser, no bitecs world APIs.
- `src/game/components/` — bitecs component storage (data only).
- `src/game/systems/` — Phaser-free logic systems, plus the bridges `playerInput.ts`, `render.ts`.
- `src/game/sim/` — headless `PlaySim` / `LearnSim`: own the world and system pipeline, emit `SimEvent`s. Helpers and test harness: [src/game/sim/README.md](../src/game/sim/README.md).
- `src/game/scenes/` — Phaser scenes and overlays: adapters only.
- `src/game/{audio,art,storage,net}/`, `src/data/` (the `/data` analytics page, DOM only), `worker/` (Cloudflare API, see [worker/README.md](../worker/README.md)).

## Scenes

Boot order is `gameConfig.scene` (`src/game/config.ts`); the first scene is the entry (`?play=1` puts `PlayScene` first). Every scene calls `applyRenderScale(this)` first in `create()` and reads pointers in world units. Canvas scaling: [rendering.md](./rendering.md) (PIXEL ghost pupils are runtime Graphics).

```text
MenuScene -> PlayScene | LearnScene | HighScoresScene | SettingsScene | RunLogOverrunScene
PlayScene -Escape-> PauseScene -> Resume | SettingsScene (returns to PauseScene) | Quit (no high-score write)
PlayScene: clear -> level transition -> upgrade modal (levels 1-8) -> level 2 only: Blinky-chases-Dot-Man intermission (`intermission.ts`, timed in `PlaySim`) -> next board | store floor | boss | RUN COMPLETE
PlayScene: caught -> death sequence -> reset, or GAME OVER -> MenuScene
```

- Pausing halts `PlayScene.update` entirely, so any state (death, transition, modal) freezes and resumes in place. `scene.pause()` never touches audio.
- `SettingsScene` takes an optional `returnScene` so it returns to the Menu or the Pause menu.
- Music tracks share the `music` category; each menu-family scene starts `menuMusic` idempotently so it never restarts between them.
- Level flow and rosters: [levels.md](./levels.md). Stores: [store.md](./store.md). Bosses: [bosses.md](./bosses.md).

## Game loop

`PlayScene.update` gathers input (Escape, modal UI), calls `PlaySim.step(input, delta)`, then applies the returned `SimEvent`s. `PlaySim.step` early-returns for blocking states (starting card, death sequence, run complete, intermission, level transition, store floor, pending upgrade offer, time-bonus drain) and otherwise runs the movement / collect / ghost / catch pipeline in a fixed order that is the source of truth in `playSim.ts`. Debug tuning (`?knobs=1`) passes a per-run `Tuning` into the sim; defaults equal the shipped constants.

## ECS boundary

- `components/**`: no Phaser; storage only.
- Logic systems: no Phaser; may mutate component arrays.
- `playerInput.ts`, `render.ts`: may import Phaser; bridges that read keys / sync drawables.
- `sim/**`: no Phaser; the only layer that creates worlds and entities.
- `scenes/**`: may import Phaser; must not import bitecs, components or logic systems.
- `domain/**`: no Phaser, no bitecs world APIs.

`npm run verify` enforces this with ESLint `no-restricted-imports` and `npm run check:ecs`. Docs are not the gate.

## Rules

A violation is a failed architecture check:

- GameObjects are never the source of truth for position; they mirror ECS `Position`.
- Scenes are adapters: input in (`SimInput`), `SimEvent`s out (sounds, drawing, HUD, modals, storage). No simulation state, systems or world APIs in scenes. Scenes read derived state through sim getters, `snapshot()` or `LearnSim.overlayModel()`.
- Gameplay decisions live in the sim, systems or `src/domain/**` and are tested headlessly ([VERIFICATION.md](./VERIFICATION.md#scene-and-render-logic)).
- Wall layout and collision come from the domain maze grid; wall Graphics draw pixel rects rasterized from domain path commands.
- One local GameObject map in the render bridge is enough. No Entity/Component/System manager classes, no god `GameManager`, no global mutable singletons.
- All randomness comes from named `RunRandom` streams ([VERIFICATION.md](./VERIFICATION.md#seeded-runs)).
- bitecs 0.4 only: no `bitecs/legacy`, no second ECS.
- Add a dependency only with a concrete need.
