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
    ghostTarget.ts            # Blinky chase/scatter/Elroy target tile
    ghostMode.ts              # level-1 scatter/chase wave clock
    ghostRelease.ts           # 1s release-after-input clock
    ghostSpeed.ts             # base / Elroy / tunnel speed resolve
  game/
    config.ts
    audio/sfx.ts
    ui/textStyles.ts
    components/               # data only — no Phaser
      Position, Velocity, Input, Facing, Speed, Player, Ghost, GhostPhase,
      Wall, Pellet, Drawable
    storage/runHistoryStorage.ts
    systems/
      playerInput.ts          # Phaser keys → sticky Input
      ghostRelease.ts         # inHouse → leaving after delay
      ghostAi.ts              # target tile → sticky Input (aligned)
      ghostSpeed.ts           # Speed from Elroy + tunnel
      ghostReverse.ts         # mode-change reverse via Input
      ghostExitHouse.ts       # leaving → active at exit tile
      movement.ts             # Facing + collision (per-eid Speed + solids)
      catchPlayer.ts          # circle overlap → caught
      collectPellets.ts
      playerDirection.ts
      render.ts               # sprites + pipes; preloadPlayArt
    scenes/
      MenuScene.ts
      HighScoresScene.ts
      PlayScene.ts
public/
  art/                        # Pac-Man / pellet / ghost / fruit PNGs
  sound/
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

**ECS ownership:** only `PlayScene` calls `createWorld` / `addEntity` and runs the system pipeline.

## Game loop

```text
PlayScene.update →
  playerInput →
  tickGhostRelease + ghostRelease →
  tickGhostMode (+ forceGhostReverse) →
  ghostAi → applyGhostSpeed →
  movement →
  ghostExitHouse (may startGhostModeClock) →
  tickRunClock →
  collectPellets → applyPelletCollect →
  catchPlayer →
  render →
  (if caught: MenuScene)
```

1. `preload()`: pac-man frames, pellet, Blinky, SFX.
2. `create()`: world, walls, pellets, player (`Speed = PLAYER_SPEED`), Blinky in house (`Speed = 0`, `GhostPhase = inHouse`), HUD, siren.
3. Ghost house / door are carved in ASCII (`=` door, `H` floor). `MAZE_PLAYER_SOLIDS` blocks the house; `MAZE_GHOST_SOLIDS` allows it.
4. Release: 1000ms after first player direction input → `leaving`, move to exit tile above the door, then `active` and start level-1 scatter/chase waves.
5. Blinky targeting: scatter → fixed `(25, -3)` unless Cruise Elroy; chase / Elroy → player tile. Steering picks min squared distance at cell centers (tie: up > left > down > right); no voluntary reverse.
6. Speeds (vs `PLAYER_SPEED`): base 0.9375×, Elroy1 (≤20 pellets) 1.0×, Elroy2 (≤10) 1.0625×, tunnel 0.5×.
7. Catch: circle overlap while Blinky is `leaving` or `active` → stop siren, `scene.start("MenuScene")` (no high-score write).
8. Pellet clear still records score + level-complete SFX as before.

## ECS boundary

| Layer                                                      | May import Phaser? | May mutate component arrays? | Role            |
| ---------------------------------------------------------- | ------------------ | ---------------------------- | --------------- |
| `game/components/**`                                       | No                 | Define storage only          | Data            |
| logic systems (`movement`, `ghostAi`, `collectPellets`, …) | No                 | Yes                          | Pure simulation |
| `playerInput`, `render`                                    | Yes                | Yes                          | Bridges         |
| `game/scenes/**`                                           | Yes                | Spawn / init only            | Wire + pipeline |
| `domain/**`                                                | No                 | No bitecs                    | Pure helpers    |

## Anti-abstraction rules

- Phaser GameObjects mirror ECS `Position`; they are not the source of truth.
- Sticky `Input` is written by `playerInput` / ghost AI / release / mode-reverse; only `movement` updates `Facing`, `Velocity`, and `Position`.
- Scenes wire/spawn/tick — no movement or AI rules in the scene body beyond calling systems and domain clocks.
- bitecs **0.4** only.

## Current runtime

- Menu → Play with maze, pellets, countdown, siren, high scores.
- One Blinky: house spawn, 1s release, scatter/chase + Elroy, tunnel slow, catch returns to menu.
- No frightened mode, energizers, or other ghosts yet.
